import mongoose from 'mongoose';
import Order from '../models/Order.js';
import ManufacturingExpense from '../models/ManufacturingExpense.js';
import OperatingExpense from '../models/OperatingExpense.js';
import OfflineSale from '../models/OfflineSale.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import CMS from '../models/CMS.js';
import { realtimeService } from './realtimeService.js';
import { sanitizePhoneNumber, isValidIndianPhone } from '../utils/phoneValidation.js';

export class FinanceService {

  // Parse date range filter safely with fallback
  static getDateFilter(period = 'all', startDate, endDate) {
    const now = new Date();
    let start = null;
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === 'custom') {
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!isNaN(parsedStart.getTime())) {
          start = new Date(parsedStart.setHours(0, 0, 0, 0));
        }
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!isNaN(parsedEnd.getTime())) {
          end = new Date(parsedEnd.setHours(23, 59, 59, 999));
        }
      }
    } else {
      // 'all' or default
      return {};
    }

    const filter = {};
    if (start) filter.$gte = start;
    if (end) filter.$lte = end;
    return Object.keys(filter).length > 0 ? filter : {};
  }

  // 1. Overall Executive Finance & Consolidated P&L Overview (Tab 1)
  static async getOverview({ period, startDate, endDate }) {
    const dateQuery = this.getDateFilter(period, startDate, endDate);
    const hasDate = Boolean(dateQuery.$gte || dateQuery.$lte);
    const orderQuery = hasDate ? { createdAt: dateQuery } : {};
    const offlineQuery = hasDate ? { saleDate: dateQuery } : {};
    const mfgQuery = hasDate ? { expenseDate: dateQuery } : {};
    const opQuery = hasDate ? { expenseDate: dateQuery } : {};

    // 1. Sales Data from Online Orders & Offline Retail
    const [orders, offlineSales] = await Promise.all([
      Order.find(orderQuery).sort({ createdAt: -1 }),
      OfflineSale.find(offlineQuery).sort({ saleDate: -1 })
    ]);

    const grossSalesValue = orders.reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);
    const offlineGrossValue = offlineSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    // Online Earned (Realized) Revenue
    const realizedOrders = orders.filter(o =>
      o.orderStatus !== 'CANCELLED' &&
      (o.paymentInfo?.status === 'PAID' || o.orderStatus === 'DELIVERED')
    );
    const realizedRevenue = realizedOrders.reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);

    // Offline Earned (Realized) Revenue & Due
    const offlineRealizedRevenue = offlineSales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const offlinePendingDue = offlineSales.reduce((sum, s) => sum + (Number(s.amountDue) || 0), 0);

    // Outstanding Receivables: Online COD in-transit + Offline Credit/Due
    const onlinePendingReceivables = orders
      .filter(o => o.paymentInfo?.method === 'COD' && o.orderStatus !== 'CANCELLED' && o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'RETURNED')
      .reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);
    const pendingReceivables = onlinePendingReceivables + offlinePendingDue;

    // Refunded & Returned Value
    const returnedOrders = orders.filter(o => o.orderStatus === 'RETURNED' || o.paymentInfo?.status === 'REFUNDED');
    const totalRefundedValue = returnedOrders.reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);

    // Shipping charges collected from customers
    const shippingRevenue = orders.reduce((sum, o) => sum + (Number(o.pricing?.shippingFee) || 0), 0);

    // Consolidated Net Sales Cash Inflow (Online + Offline)
    const netSalesInflow = realizedRevenue + offlineRealizedRevenue;

    // Manufacturing / Sourcing Expenses (COGS)
    const mfgExpenses = await ManufacturingExpense.find(mfgQuery).sort({ expenseDate: -1 });
    const totalManufacturingCost = mfgExpenses.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
    const totalManufacturingPaid = mfgExpenses.reduce((sum, m) => sum + (Number(m.amountPaid) || 0), 0);
    const totalManufacturingDue = mfgExpenses.reduce((sum, m) => sum + (Number(m.amountDue) || 0), 0);
    const totalSupplierReturnsRefunded = mfgExpenses.reduce((sum, m) => sum + (Number(m.totalRefundedFromReturns) || 0), 0);
    const netManufacturingExpense = Math.max(0, totalManufacturingCost - totalSupplierReturnsRefunded);

    // Operating Overhead Expenses
    const operatingExpenses = await OperatingExpense.find(opQuery).sort({ expenseDate: -1 });
    const totalOperatingExpense = operatingExpenses.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    // Operating Expenses by Category
    const categoryTotals = {};
    operatingExpenses.forEach(op => {
      const cat = op.category || 'MISCELLANEOUS';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(op.amount) || 0);
    });

    // P&L Calculations
    const totalOutflow = netManufacturingExpense + totalOperatingExpense;
    const grossProfit = netSalesInflow - netManufacturingExpense;
    const netProfit = netSalesInflow - totalOutflow;
    const netProfitMargin = netSalesInflow > 0 ? Number(((netProfit / netSalesInflow) * 100).toFixed(1)) : 0;

    return {
      period: period || 'all',
      dateRange: {
        startDate: dateQuery.$gte || null,
        endDate: dateQuery.$lte || null
      },
      summary: {
        netSalesInflow,
        totalOutflow,
        grossProfit,
        netProfit,
        netProfitMargin,
        pendingReceivables,
        outstandingPayables: totalManufacturingDue,

        sellingSummary: {
          totalOrdersCount: orders.length,
          grossSalesValue,
          realizedRevenue,
          pendingReceivables,
          totalRefundedValue,
          shippingRevenue,
          offlineSalesCount: offlineSales.length,
          offlineGrossValue,
          offlineRealizedRevenue,
          offlinePendingDue,
          combinedGrossSales: grossSalesValue + offlineGrossValue,
          combinedRealizedInflow: netSalesInflow
        },
        manufacturingSummary: {
          totalBatches: mfgExpenses.length,
          totalManufacturingCost,
          totalManufacturingPaid,
          totalManufacturingDue,
          totalSupplierReturnsRefunded,
          netManufacturingExpense
        },
        operatingSummary: {
          totalEntries: operatingExpenses.length,
          totalOperatingExpense,
          categoryBreakdown: categoryTotals
        }
      },
      recentTransactions: {
        recentOrders: orders.slice(0, 5),
        recentProcurements: mfgExpenses.slice(0, 5),
        recentExpenses: operatingExpenses.slice(0, 5)
      }
    };
  }

  // 2. Selling Finance (Tab 2)
  static async getSalesFinance({ period, startDate, endDate }) {
    const dateQuery = this.getDateFilter(period, startDate, endDate);
    const hasDate = Boolean(dateQuery.$gte || dateQuery.$lte);
    const orderQuery = hasDate ? { createdAt: dateQuery } : {};
    const offlineQuery = hasDate ? { saleDate: dateQuery } : {};

    const [orders, offlineSales] = await Promise.all([
      Order.find(orderQuery).sort({ createdAt: -1 }),
      OfflineSale.find(offlineQuery).sort({ saleDate: -1 })
    ]);

    // 1. Online Sales Metrics
    const onlineGross = orders.reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);
    const paidOrders = orders.filter(o => o.orderStatus !== 'CANCELLED' && (o.paymentInfo?.status === 'PAID' || o.orderStatus === 'DELIVERED'));
    const onlineRealized = paidOrders.reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);

    const pendingCODOrders = orders.filter(o =>
      o.paymentInfo?.method === 'COD' &&
      o.orderStatus !== 'CANCELLED' &&
      o.orderStatus !== 'DELIVERED' &&
      o.orderStatus !== 'RETURNED'
    );
    const onlinePendingDue = pendingCODOrders.reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);

    const returnedOrders = orders.filter(o => o.orderStatus === 'RETURNED' || o.paymentInfo?.status === 'REFUNDED');
    const onlineReturned = returnedOrders.reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);

    // Breakdown for Cancelled and Refunded orders
    const refundedOrdersList = returnedOrders;
    const refundedValue = onlineReturned;
    const refundedCount = refundedOrdersList.length;

    const cancelledOrders = orders.filter(o =>
      ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(o.orderStatus) &&
      o.paymentInfo?.status !== 'REFUNDED' &&
      o.orderStatus !== 'RETURNED'
    );
    const cancelledValue = cancelledOrders.reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);
    const cancelledCount = cancelledOrders.length;

    const cancelledAndRefundedValue = refundedValue + cancelledValue;
    const cancelledAndRefundedCount = refundedCount + cancelledCount;

    const onlineShipping = orders.reduce((sum, o) => sum + (Number(o.pricing?.shippingFee) || 0), 0);

    // 2. Offline Sales Metrics
    const offlineGross = offlineSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const offlineRealized = offlineSales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const offlineDue = offlineSales.reduce((sum, s) => sum + (Number(s.amountDue) || 0), 0);
    const offlineCash = offlineSales.filter(s => s.paymentMode === 'CASH').reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const offlineUPI = offlineSales.filter(s => s.paymentMode === 'UPI').reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const offlineBank = offlineSales.filter(s => s.paymentMode === 'BANK_TRANSFER').reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);

    // 3. Combined / Overall Metrics
    const combinedGross = onlineGross + offlineGross;
    const combinedRealized = onlineRealized + offlineRealized;
    const combinedPendingDue = onlinePendingDue + offlineDue;
    const totalTransactions = orders.length + offlineSales.length;

    const onlineSharePercent = combinedGross > 0 ? Number(((onlineGross / combinedGross) * 100).toFixed(1)) : 0;
    const offlineSharePercent = combinedGross > 0 ? Number(((offlineGross / combinedGross) * 100).toFixed(1)) : 0;

    return {
      period: period || 'all',
      dateRange: {
        startDate: dateQuery.$gte || null,
        endDate: dateQuery.$lte || null
      },
      overall: {
        combinedGross,
        combinedRealized,
        combinedPendingDue,
        totalTransactions,
        onlineOrdersCount: orders.length,
        offlineSalesCount: offlineSales.length,
        onlineGross,
        offlineGross,
        onlineRealized,
        offlineRealized,
        onlinePendingDue,
        offlineDue,
        onlineSharePercent,
        offlineSharePercent
      },
      online: {
        metrics: {
          totalOrdersCount: orders.length,
          grossSales: onlineGross,
          realizedEarning: onlineRealized,
          pendingDue: onlinePendingDue,
          returnedValue: onlineReturned,
          refundedValue,
          refundedCount,
          cancelledValue,
          cancelledCount,
          cancelledAndRefundedValue,
          cancelledAndRefundedCount,
          shippingCollected: onlineShipping,
          netSalesRevenue: onlineRealized
        },
        orders
      },
      offline: {
        metrics: {
          totalSalesCount: offlineSales.length,
          grossSales: offlineGross,
          realizedEarning: offlineRealized,
          pendingDue: offlineDue,
          cashCollected: offlineCash,
          upiCollected: offlineUPI,
          bankCollected: offlineBank
        },
        sales: offlineSales
      },
      // Backward compatibility fields for current view
      metrics: {
        totalOrdersCount: orders.length,
        grossSales: onlineGross,
        realizedEarning: onlineRealized,
        pendingDue: onlinePendingDue,
        returnedValue: onlineReturned,
        refundedValue,
        refundedCount,
        cancelledValue,
        cancelledCount,
        cancelledAndRefundedValue,
        cancelledAndRefundedCount,
        shippingCollected: onlineShipping,
        netSalesRevenue: onlineRealized
      },
      orders,
      offlineSales
    };
  }

  // 3. Manufacturing & Sourcing (Tab 3)
  static async getManufacturingFinance({ period, startDate, endDate }) {
    const dateQuery = this.getDateFilter(period, startDate, endDate);
    const hasDate = Boolean(dateQuery.$gte || dateQuery.$lte);
    const mfgQuery = hasDate ? { expenseDate: dateQuery } : {};

    const entries = await ManufacturingExpense.find(mfgQuery).sort({ expenseDate: -1 });

    const totalCost = entries.reduce((sum, e) => sum + (Number(e.totalCost) || 0), 0);
    const totalPaid = entries.reduce((sum, e) => sum + (Number(e.amountPaid) || 0), 0);
    const totalDue = entries.reduce((sum, e) => sum + (Number(e.amountDue) || 0), 0);
    const totalRefunded = entries.reduce((sum, e) => sum + (Number(e.totalRefundedFromReturns) || 0), 0);
    const netManufacturingOutflow = Math.max(0, totalCost - totalRefunded);

    return {
      period: period || 'all',
      dateRange: {
        startDate: dateQuery.$gte || null,
        endDate: dateQuery.$lte || null
      },
      metrics: {
        totalBatches: entries.length,
        totalCost,
        totalPaid,
        totalDue,
        totalRefunded,
        netManufacturingOutflow
      },
      entries
    };
  }

  static async createManufacturingExpense(data, user) {
    const qty = Math.max(1, Number(data.quantity) || 1);
    const unitCost = Math.max(0, Number(data.unitCost) || 0);
    const totalCost = (data.totalCost !== undefined && Number(data.totalCost) >= 0) ? Number(data.totalCost) : (qty * unitCost);
    const amountPaid = Math.max(0, Number(data.amountPaid) || 0);
    const amountDue = Math.max(0, totalCost - amountPaid);

    let paymentStatus = 'DUE';
    if (amountPaid >= totalCost) paymentStatus = 'PAID';
    else if (amountPaid > 0) paymentStatus = 'PARTIAL';

    let batchNumber = data.batchNumber?.trim();
    if (!batchNumber) {
      const count = await ManufacturingExpense.countDocuments();
      let candidateNum = count + 1;
      let candidate = `BATCH-${String(candidateNum).padStart(2, '0')}`;
      while (await ManufacturingExpense.exists({ batchNumber: candidate })) {
        candidateNum++;
        candidate = `BATCH-${String(candidateNum).padStart(2, '0')}`;
      }
      batchNumber = candidate;
    }

    const entry = new ManufacturingExpense({
      productName: data.productName || 'Herbal Product Batch',
      productId: (data.productId && mongoose.Types.ObjectId.isValid(data.productId)) ? data.productId : undefined,
      batchNumber,
      vendorName: data.vendorName || 'Manufacturing Vendor',
      vendorContact: data.vendorContact || '',
      quantity: qty,
      unitCost,
      totalCost,
      amountPaid,
      amountDue,
      paymentStatus,
      paymentMode: data.paymentMode || 'BANK_TRANSFER',
      invoiceNumber: data.invoiceNumber || '',
      expenseDate: (data.expenseDate && !isNaN(new Date(data.expenseDate).getTime())) ? new Date(data.expenseDate) : new Date(),
      notes: data.notes || '',
      createdBy: (user?._id && mongoose.Types.ObjectId.isValid(user._id)) ? user._id : undefined
    });

    await entry.save();
    return entry;
  }

  // Record additional installment or full payment to supplier
  static async recordManufacturingPayment(id, { paymentAmount, paymentMode, notes }) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid procurement record ID');
    const entry = await ManufacturingExpense.findById(id);
    if (!entry) throw new Error('Procurement record not found');

    const addedAmount = Math.max(0, Number(paymentAmount) || 0);
    entry.amountPaid = (Number(entry.amountPaid) || 0) + addedAmount;
    const refunded = Number(entry.totalRefundedFromReturns) || 0;
    entry.amountDue = Math.max(0, (Number(entry.totalCost) || 0) - entry.amountPaid - refunded);

    if (entry.amountDue <= 0) {
      entry.paymentStatus = 'PAID';
    } else {
      entry.paymentStatus = 'PARTIAL';
    }

    if (paymentMode) entry.paymentMode = paymentMode;
    if (notes) entry.notes = (entry.notes ? entry.notes + ' | ' : '') + notes;

    await entry.save();
    return entry;
  }

  // Record return to supplier / manufacturer with refund credited back
  static async recordManufacturingReturn(id, { quantity, refundAmount, reason }) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid procurement record ID');
    const entry = await ManufacturingExpense.findById(id);
    if (!entry) throw new Error('Procurement record not found');

    const returnQty = Math.max(1, Number(quantity) || 1);
    const unitCost = Number(entry.unitCost) || 0;
    const refund = Number(refundAmount !== undefined ? refundAmount : returnQty * unitCost) || 0;

    entry.returns.push({
      returnDate: new Date(),
      quantity: returnQty,
      refundAmount: refund,
      reason: reason || 'Defective / Excess returned to supplier',
      refundStatus: 'CREDITED'
    });

    entry.totalRefundedFromReturns = (Number(entry.totalRefundedFromReturns) || 0) + refund;
    entry.amountDue = Math.max(0, (Number(entry.totalCost) || 0) - (Number(entry.amountPaid) || 0) - entry.totalRefundedFromReturns);

    if (entry.amountDue <= 0 && entry.amountPaid >= (entry.totalCost - entry.totalRefundedFromReturns)) {
      entry.paymentStatus = 'PAID';
    }

    await entry.save();
    return entry;
  }

  static async updateManufacturingExpense(id, data, user) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid record ID');
    const entry = await ManufacturingExpense.findById(id);
    if (!entry) throw new Error('Manufacturing procurement record not found');

    const previousSnapshot = entry.toObject();
    const changes = [];

    const track = (field, label, newVal, formatter) => {
      if (newVal === undefined) return;
      const oldVal = entry[field];
      const isDifferent = String(oldVal ?? '') !== String(newVal ?? '');
      if (isDifferent) {
        changes.push({
          field,
          label,
          oldValue: oldVal,
          newValue: newVal,
          description: formatter
            ? formatter(oldVal, newVal)
            : `Changed ${label} from "${oldVal || 'None'}" to "${newVal || 'None'}"`
        });
        entry[field] = newVal;
      }
    };

    if (data.productName !== undefined) track('productName', 'Product Name', data.productName.trim());
    if (data.batchNumber !== undefined) track('batchNumber', 'Batch Number', data.batchNumber.trim());
    if (data.vendorName !== undefined) track('vendorName', 'Vendor / Supplier', data.vendorName.trim());
    if (data.vendorContact !== undefined) {
      let cleanContact = data.vendorContact.trim() ? sanitizePhoneNumber(data.vendorContact) : '';
      if (cleanContact && !isValidIndianPhone(cleanContact)) {
        throw new Error('Vendor contact must be a valid 10-digit Indian mobile number');
      }
      track('vendorContact', 'Vendor Contact', cleanContact);
    }
    if (data.invoiceNumber !== undefined) track('invoiceNumber', 'Invoice Number', data.invoiceNumber.trim());
    if (data.paymentMode !== undefined) track('paymentMode', 'Payment Mode', data.paymentMode);
    if (data.notes !== undefined) track('notes', 'Notes / Remarks', data.notes.trim());

    if (data.expenseDate !== undefined) {
      const parsedDate = new Date(data.expenseDate);
      if (!isNaN(parsedDate.getTime())) {
        track('expenseDate', 'Procurement Date', parsedDate, (o, n) => `Updated Date to ${new Date(n).toLocaleDateString('en-IN')}`);
      }
    }

    const oldQty = entry.quantity;
    const newQty = data.quantity !== undefined ? Math.max(1, Number(data.quantity) || 1) : entry.quantity;
    const newUnitCost = data.unitCost !== undefined ? Math.max(0, Number(data.unitCost) || 0) : entry.unitCost;
    const calculatedTotal = (data.totalCost !== undefined && Number(data.totalCost) >= 0) ? Number(data.totalCost) : (newQty * newUnitCost);

    if (newQty !== oldQty) {
      track('quantity', 'Batch Quantity', newQty, (o, n) => `Changed Batch Quantity from ${o} units to ${n} units`);
      if (entry.productId && mongoose.Types.ObjectId.isValid(entry.productId)) {
        const qtyDiff = newQty - oldQty;
        await Product.findByIdAndUpdate(entry.productId, { $inc: { stock: qtyDiff } });
      }
    }
    if (newUnitCost !== entry.unitCost) {
      track('unitCost', 'Unit Cost (₹)', newUnitCost, (o, n) => `Changed Unit Cost from ₹${o} to ₹${n}`);
    }
    if (calculatedTotal !== entry.totalCost) {
      track('totalCost', 'Total Batch Cost (₹)', calculatedTotal, (o, n) => `Changed Total Batch Cost from ₹${o} to ₹${n}`);
    }

    entry.quantity = newQty;
    entry.unitCost = newUnitCost;
    entry.totalCost = calculatedTotal;

    if (data.amountPaid !== undefined) {
      const newPaid = Math.max(0, Number(data.amountPaid) || 0);
      if (newPaid !== entry.amountPaid) {
        track('amountPaid', 'Paid to Supplier (₹)', newPaid, (o, n) => `Changed Amount Paid from ₹${o} to ₹${n}`);
      }
      entry.amountPaid = newPaid;
    }

    const totalReturns = Number(entry.totalRefundedFromReturns) || 0;
    entry.amountDue = Math.max(0, entry.totalCost - entry.amountPaid - totalReturns);
    if (entry.amountDue <= 0 && entry.amountPaid >= (entry.totalCost - totalReturns)) {
      entry.paymentStatus = 'PAID';
    } else if (entry.amountPaid > 0) {
      entry.paymentStatus = 'PARTIAL';
    } else {
      entry.paymentStatus = 'DUE';
    }

    if (changes.length > 0) {
      const adminInfo = {
        userId: user?._id || user?.id,
        name: user?.name || 'Administrator',
        email: user?.email
      };

      for (const ch of changes) {
        entry.changeLogs.push({
          field: ch.field,
          label: ch.label,
          oldValue: ch.oldValue,
          newValue: ch.newValue,
          description: ch.description,
          changedBy: adminInfo,
          changedAt: new Date()
        });
      }

      try {
        await AuditLog.create({
          action: 'EDITED',
          entityType: 'MANUFACTURING',
          entityId: entry.batchNumber || entry._id.toString(),
          entityTitle: `${entry.productName} - Batch ${entry.batchNumber || 'N/A'} (${entry.vendorName})`,
          amount: entry.totalCost,
          performedBy: { ...adminInfo, role: user?.role || 'admin' },
          reason: `Edited fields: ${changes.map(c => c.label).join(', ')}`,
          changes,
          previousState: previousSnapshot,
          newState: entry.toObject()
        });
      } catch (err) {
        console.error('AuditLog error:', err);
      }
    }

    await entry.save();
    return entry;
  }

  static async deleteManufacturingExpense(id, user) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid record ID');
    const mfg = await ManufacturingExpense.findById(id);
    if (!mfg) throw new Error('Manufacturing procurement record not found');

    // Record Ultra-Lightweight Deletion Log (Date, Category, Title/ID, Amount - 0 heavy snapshot)
    try {
      const entityTitle = mfg.vendorName
        ? `${mfg.productName} (${mfg.vendorName})`
        : (mfg.productName || 'Manufacturing Batch');

      await AuditLog.create({
        action: 'DELETED',
        entityType: 'MANUFACTURING',
        entityId: mfg.batchNumber || mfg._id.toString(),
        entityTitle: entityTitle,
        amount: mfg.totalCost || 0
      });
    } catch (auditErr) {
      console.error('Failed to log deletion for mfg:', auditErr);
    }

    await ManufacturingExpense.findByIdAndDelete(id);
    return { success: true, message: 'Procurement record deleted successfully' };
  }

  // 4. Operating Overhead Expenses (Tab 4)
  static async getOperatingExpenses({ period, startDate, endDate }) {
    const dateQuery = this.getDateFilter(period, startDate, endDate);
    const hasDate = Boolean(dateQuery.$gte || dateQuery.$lte);
    const opQuery = hasDate ? { expenseDate: dateQuery } : {};

    const entries = await OperatingExpense.find(opQuery).sort({ expenseDate: -1 });
    const totalOperatingExpense = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const categoryBreakdown = {};
    entries.forEach(e => {
      const cat = e.category || 'MISCELLANEOUS';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (Number(e.amount) || 0);
    });

    return {
      period: period || 'all',
      dateRange: {
        startDate: dateQuery.$gte || null,
        endDate: dateQuery.$lte || null
      },
      metrics: {
        totalEntries: entries.length,
        totalOperatingExpense,
        categoryBreakdown
      },
      entries
    };
  }

  static async createOperatingExpense(data, user) {
    const year = new Date().getFullYear();
    const count = await OperatingExpense.countDocuments();
    let candidateNum = count + 1;
    let candidate = `OVH-${year}-${String(candidateNum).padStart(4, '0')}`;
    while (await OperatingExpense.exists({ expenseId: candidate })) {
      candidateNum++;
      candidate = `OVH-${year}-${String(candidateNum).padStart(4, '0')}`;
    }

    const entry = new OperatingExpense({
      expenseId: candidate,
      category: data.category || 'MISCELLANEOUS',
      title: data.title ? data.title.trim() : 'Overhead Expense',
      amount: Math.max(0, Number(data.amount) || 0),
      paymentMode: data.paymentMode || 'UPI',
      paidTo: data.paidTo || '',
      expenseDate: (data.expenseDate && !isNaN(new Date(data.expenseDate).getTime())) ? new Date(data.expenseDate) : new Date(),
      billNumber: data.billNumber || '',
      receiptUrl: data.receiptUrl || '',
      notes: data.notes || '',
      createdBy: (user?._id && mongoose.Types.ObjectId.isValid(user._id)) ? user._id : undefined
    });

    await entry.save();
    return entry;
  }

  static async updateOperatingExpense(id, data, user) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid record ID');
    const entry = await OperatingExpense.findById(id);
    if (!entry) throw new Error('Operating expense record not found');

    const previousSnapshot = entry.toObject();
    const changes = [];

    const track = (field, label, newVal, formatter) => {
      if (newVal === undefined) return;
      const oldVal = entry[field];
      const isDifferent = String(oldVal ?? '') !== String(newVal ?? '');
      if (isDifferent) {
        changes.push({
          field,
          label,
          oldValue: oldVal,
          newValue: newVal,
          description: formatter
            ? formatter(oldVal, newVal)
            : `Changed ${label} from "${oldVal || 'None'}" to "${newVal || 'None'}"`
        });
        entry[field] = newVal;
      }
    };

    if (data.category !== undefined) track('category', 'Expense Category', data.category);
    if (data.title !== undefined) track('title', 'Expense Title', data.title.trim());
    if (data.amount !== undefined) {
      const newAmt = Math.max(0, Number(data.amount) || 0);
      track('amount', 'Expense Amount (₹)', newAmt, (o, n) => `Changed Expense Amount from ₹${o || 0} to ₹${n || 0}`);
    }
    if (data.paymentMode !== undefined) track('paymentMode', 'Payment Mode', data.paymentMode);
    if (data.paidTo !== undefined) track('paidTo', 'Paid To / Vendor', data.paidTo.trim());
    if (data.billNumber !== undefined) track('billNumber', 'Bill / Voucher #', data.billNumber.trim());
    if (data.notes !== undefined) track('notes', 'Notes / Remarks', data.notes.trim());

    if (data.expenseDate !== undefined) {
      const parsedDate = new Date(data.expenseDate);
      if (!isNaN(parsedDate.getTime())) {
        track('expenseDate', 'Expense Date', parsedDate, (o, n) => `Updated Date to ${new Date(n).toLocaleDateString('en-IN')}`);
      }
    }

    if (changes.length > 0) {
      const adminInfo = {
        userId: user?._id || user?.id,
        name: user?.name || 'Administrator',
        email: user?.email
      };

      for (const ch of changes) {
        entry.changeLogs.push({
          field: ch.field,
          label: ch.label,
          oldValue: ch.oldValue,
          newValue: ch.newValue,
          description: ch.description,
          changedBy: adminInfo,
          changedAt: new Date()
        });
      }

      try {
        await AuditLog.create({
          action: 'EDITED',
          entityType: 'OPERATING',
          entityId: entry._id.toString(),
          entityTitle: `${entry.category} - ${entry.title}`,
          amount: entry.amount,
          performedBy: { ...adminInfo, role: user?.role || 'admin' },
          reason: `Edited fields: ${changes.map(c => c.label).join(', ')}`,
          changes,
          previousState: previousSnapshot,
          newState: entry.toObject()
        });
      } catch (err) {
        console.error('AuditLog error:', err);
      }
    }

    await entry.save();
    return entry;
  }

  static async deleteOperatingExpense(id, user) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid record ID');
    const op = await OperatingExpense.findById(id);
    if (!op) throw new Error('Operating expense record not found');

    // Record Ultra-Lightweight Deletion Log (Date, Category, Title/ID, Amount - 0 heavy snapshot)
    try {
      const year = new Date(op.expenseDate || op.createdAt || Date.now()).getFullYear();
      const expenseId = op.expenseId || `OVH-${year}-${op._id.toString().slice(-4).toUpperCase()}`;
      const entityTitle = op.title
        ? `${op.category} - ${op.title}`
        : op.category;

      await AuditLog.create({
        action: 'DELETED',
        entityType: 'OPERATING',
        entityId: expenseId,
        entityTitle: entityTitle,
        amount: op.amount || 0
      });
    } catch (auditErr) {
      console.error('Failed to log deletion for operating expense:', auditErr);
    }

    await OperatingExpense.findByIdAndDelete(id);
    return { success: true, message: 'Operating expense deleted successfully' };
  }

  // ==========================================
  // OFFLINE SALES (Local Retail & Direct Sales)
  // ==========================================
  static async getOfflineSales({ period, startDate, endDate, search }) {
    const dateQuery = this.getDateFilter(period, startDate, endDate);
    const hasDate = Boolean(dateQuery.$gte || dateQuery.$lte);
    const query = hasDate ? { saleDate: dateQuery } : {};

    if (search) {
      query.$or = [
        { saleId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { locationArea: { $regex: search, $options: 'i' } },
        { billNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const sales = await OfflineSale.find(query).sort({ saleDate: -1 });
    const grossSales = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const realizedEarning = sales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const pendingDue = sales.reduce((sum, s) => sum + (Number(s.amountDue) || 0), 0);

    return {
      sales,
      metrics: {
        totalSalesCount: sales.length,
        grossSales,
        realizedEarning,
        pendingDue
      }
    };
  }

  static async createOfflineSale(data, user) {
    const count = await OfflineSale.countDocuments();
    const saleId = `OFF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const totalAmount = Math.max(0, Number(data.totalAmount) || 0);
    const amountPaid = Math.max(0, Math.min(totalAmount, Number(data.amountPaid ?? totalAmount) || 0));
    const amountDue = Math.max(0, totalAmount - amountPaid);

    let paymentStatus = 'PAID';
    if (amountPaid === 0) paymentStatus = 'PENDING';
    else if (amountPaid < totalAmount) paymentStatus = 'PARTIAL';

    const items = (data.items || []).map(item => ({
      product: (item.productId || item.product) && mongoose.Types.ObjectId.isValid(item.productId || item.product) ? (item.productId || item.product) : undefined,
      productName: item.productName || 'Novise Product',
      sku: item.sku || '',
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      totalPrice: (Math.max(1, Number(item.quantity) || 1)) * (Math.max(0, Number(item.unitPrice) || 0))
    }));

    let cleanCustomerPhone = '';
    if (data.customerPhone && String(data.customerPhone).trim()) {
      cleanCustomerPhone = sanitizePhoneNumber(data.customerPhone);
      if (!isValidIndianPhone(cleanCustomerPhone)) {
        const error = new Error('Customer phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9');
        error.statusCode = 400;
        throw error;
      }
    }

    const offlineSale = new OfflineSale({
      saleId,
      customerName: data.customerName?.trim() || 'Local Customer',
      customerPhone: cleanCustomerPhone,
      locationArea: data.locationArea?.trim() || '',
      items,
      totalAmount,
      amountPaid,
      amountDue,
      paymentMode: data.paymentMode || 'CASH',
      paymentStatus,
      billNumber: data.billNumber?.trim() || '',
      saleDate: (data.saleDate && !isNaN(new Date(data.saleDate).getTime())) ? new Date(data.saleDate) : new Date(),
      inventoryDeducted: false,
      notes: data.notes?.trim() || '',
      createdBy: (user?._id && mongoose.Types.ObjectId.isValid(user._id)) ? user._id : undefined
    });

    // Check automatic stock management configuration from CMS
    const cmsConfig = await CMS.findOne({ key: 'global_cms' }).lean();
    const autoManageStock = cmsConfig?.orderSettings?.autoManageStock !== false;
    const shouldDeduct = autoManageStock && data.deductStock !== false;

    offlineSale.inventoryDeducted = shouldDeduct;
    await offlineSale.save();

    // Deduct physical inventory if automatic stock management is enabled
    if (shouldDeduct && items.length > 0) {
      for (const item of items) {
        if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity }
          });
        }
      }
      realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_deducted' });
    }

    return offlineSale;
  }

  static async updateOfflineSalePayment(id, { paymentAmount, amountPaid, paymentMode, notes }, user) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid record ID');
    const sale = await OfflineSale.findById(id);
    if (!sale) throw new Error('Offline sale record not found');

    let addedPayment = 0;
    let newPaid = Number(sale.amountPaid) || 0;

    if (paymentAmount !== undefined && paymentAmount !== null && Number(paymentAmount) > 0) {
      addedPayment = Number(paymentAmount);
      newPaid = Math.max(0, Math.min(sale.totalAmount, (Number(sale.amountPaid) || 0) + addedPayment));
    } else if (amountPaid !== undefined && amountPaid !== null && Number(amountPaid) > 0) {
      const targetPaid = Math.max(0, Math.min(sale.totalAmount, Number(amountPaid)));
      addedPayment = Math.max(0, targetPaid - (Number(sale.amountPaid) || 0));
      newPaid = targetPaid;
    } else {
      throw new Error('Payment amount must be greater than 0');
    }

    const previousPaid = sale.amountPaid;
    const previousDue = sale.amountDue;

    sale.amountPaid = newPaid;
    sale.amountDue = Math.max(0, sale.totalAmount - newPaid);

    if (sale.amountDue <= 0) {
      sale.paymentStatus = 'PAID';
    } else if (sale.amountPaid > 0) {
      sale.paymentStatus = 'PARTIAL';
    } else {
      sale.paymentStatus = 'PENDING';
    }

    if (paymentMode) {
      if (sale.paymentMode === 'CREDIT_UDHAAR' || sale.paymentMode === 'CREDIT' || sale.paymentStatus === 'PAID') {
        sale.paymentMode = paymentMode;
      }
    }

    const noteText = notes ? notes.trim() : '';
    const paymentLogText = `Collected ₹${addedPayment} via ${paymentMode || sale.paymentMode}${noteText ? ` (${noteText})` : ''} on ${new Date().toLocaleDateString('en-IN')}`;
    sale.notes = (sale.notes ? sale.notes + ' | ' : '') + paymentLogText;

    if (!Array.isArray(sale.changeLogs)) {
      sale.changeLogs = [];
    }

    const adminInfo = {
      userId: user?._id || user?.id,
      name: user?.name || 'Administrator',
      email: user?.email
    };

    sale.changeLogs.push({
      field: 'amountPaid',
      label: 'Payment Collected',
      oldValue: `₹${previousPaid}`,
      newValue: `₹${sale.amountPaid}`,
      description: `Collected payment of ₹${addedPayment} via ${paymentMode || sale.paymentMode}. Balance due is now ₹${sale.amountDue}.`,
      changedBy: adminInfo,
      changedAt: new Date()
    });

    await sale.save();
    return sale;
  }

  static async updateOfflineSale(id, data, user) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid record ID');
    const sale = await OfflineSale.findById(id);
    if (!sale) throw new Error('Offline sale record not found');

    const previousSnapshot = sale.toObject();
    const changes = [];

    const track = (field, label, newVal, formatter) => {
      if (newVal === undefined) return;
      const oldVal = sale[field];
      const isDifferent = String(oldVal ?? '') !== String(newVal ?? '');
      if (isDifferent) {
        changes.push({
          field,
          label,
          oldValue: oldVal,
          newValue: newVal,
          description: formatter
            ? formatter(oldVal, newVal)
            : `Changed ${label} from "${oldVal || 'None'}" to "${newVal || 'None'}"`
        });
        sale[field] = newVal;
      }
    };

    if (data.customerName !== undefined) track('customerName', 'Customer Name', data.customerName.trim());
    if (data.customerPhone !== undefined) {
      let cleanPhone = data.customerPhone.trim() ? sanitizePhoneNumber(data.customerPhone) : '';
      if (cleanPhone && !isValidIndianPhone(cleanPhone)) {
        throw new Error('Customer phone number must be a valid 10-digit Indian mobile number');
      }
      track('customerPhone', 'Phone Number', cleanPhone);
    }
    if (data.locationArea !== undefined) track('locationArea', 'Area / Location', data.locationArea.trim());
    if (data.billNumber !== undefined) track('billNumber', 'Bill / Invoice #', data.billNumber.trim());
    if (data.notes !== undefined) track('notes', 'Notes / Remarks', data.notes.trim());
    if (data.paymentMode !== undefined) track('paymentMode', 'Payment Mode', data.paymentMode);

    if (data.saleDate !== undefined) {
      const parsedDate = new Date(data.saleDate);
      if (!isNaN(parsedDate.getTime())) {
        track('saleDate', 'Sale Date', parsedDate, (o, n) => `Updated Sale Date to ${new Date(n).toLocaleDateString('en-IN')}`);
      }
    }

    // Amounts updates
    const oldTotal = sale.totalAmount;
    const oldPaid = sale.amountPaid;
    const newTotal = data.totalAmount !== undefined ? Math.max(0, Number(data.totalAmount) || 0) : oldTotal;
    const newPaid = data.amountPaid !== undefined ? Math.max(0, Number(data.amountPaid) || 0) : oldPaid;

    if (newTotal !== oldTotal) {
      track('totalAmount', 'Total Sale Amount (₹)', newTotal, (o, n) => `Changed Total Sale Amount from ₹${o || 0} to ₹${n || 0}`);
    }
    if (newPaid !== oldPaid) {
      track('amountPaid', 'Paid Amount (₹)', newPaid, (o, n) => `Changed Paid Amount from ₹${o || 0} to ₹${n || 0}`);
    }

    sale.totalAmount = newTotal;
    sale.amountPaid = newPaid;
    sale.amountDue = Math.max(0, newTotal - newPaid);
    if (newPaid >= newTotal && newTotal > 0) sale.paymentStatus = 'PAID';
    else if (newPaid > 0) sale.paymentStatus = 'PARTIAL';
    else sale.paymentStatus = 'PENDING';

    // Synchronize item quantity and product inventory delta
    const oldItem = sale.items?.[0] || {};
    const oldQty = Number(oldItem.quantity) || 1;
    const oldProductId = oldItem.product ? oldItem.product.toString() : '';

    const newItem = data.items?.[0] || {};
    const hasItemUpdate = data.quantity !== undefined || newItem.quantity !== undefined || data.productId !== undefined || newItem.product !== undefined;

    if (hasItemUpdate) {
      const newQty = Math.max(1, Number(newItem.quantity ?? data.quantity ?? oldQty));
      const newUnitPrice = Math.max(0, Number(newItem.unitPrice ?? data.unitPrice ?? oldItem.unitPrice ?? 0));
      const newProductId = (newItem.product || data.productId || oldProductId || '').toString();
      const newProductName = newItem.productName || data.productName || oldItem.productName || 'Novise Product';
      const newSku = newItem.sku || data.productSku || oldItem.sku || '';

      if (newQty !== oldQty) {
        changes.push({
          field: 'quantity',
          label: 'Quantity Sold',
          oldValue: oldQty,
          newValue: newQty,
          description: `Changed quantity sold from ${oldQty} units to ${newQty} units`
        });
      }

      // Check Automatic Stock Management configuration from CMS
      const cmsConfig = await CMS.findOne({ key: 'global_cms' }).lean();
      const autoManageStock = cmsConfig?.orderSettings?.autoManageStock !== false;

      if (autoManageStock && sale.inventoryDeducted) {
        if (oldProductId && newProductId && oldProductId === newProductId) {
          const delta = newQty - oldQty;
          if (delta !== 0) {
            // delta > 0: more items sold, deduct stock. delta < 0: reduced, restore stock
            await Product.findByIdAndUpdate(newProductId, {
              $inc: { stock: -delta }
            });
            realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_adjusted', productId: newProductId });
          }
        } else if (oldProductId !== newProductId) {
          if (oldProductId && mongoose.Types.ObjectId.isValid(oldProductId)) {
            await Product.findByIdAndUpdate(oldProductId, {
              $inc: { stock: oldQty }
            });
          }
          if (newProductId && mongoose.Types.ObjectId.isValid(newProductId)) {
            await Product.findByIdAndUpdate(newProductId, {
              $inc: { stock: -newQty }
            });
          }
          realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_adjusted' });
        }
      }

      sale.items = [{
        product: (newProductId && mongoose.Types.ObjectId.isValid(newProductId)) ? newProductId : undefined,
        productName: newProductName,
        sku: newSku,
        quantity: newQty,
        unitPrice: newUnitPrice,
        totalPrice: newQty * newUnitPrice
      }];
    }

    if (changes.length > 0) {
      const adminInfo = {
        userId: user?._id || user?.id,
        name: user?.name || 'Administrator',
        email: user?.email
      };

      for (const ch of changes) {
        sale.changeLogs.push({
          field: ch.field,
          label: ch.label,
          oldValue: ch.oldValue,
          newValue: ch.newValue,
          description: ch.description,
          changedBy: adminInfo,
          changedAt: new Date()
        });
      }

      try {
        await AuditLog.create({
          action: 'EDITED',
          entityType: 'OFFLINE_SALE',
          entityId: sale.saleId || sale._id.toString(),
          entityTitle: `${sale.customerName} (Bill #${sale.billNumber || sale.saleId})`,
          amount: sale.totalAmount,
          performedBy: { ...adminInfo, role: user?.role || 'admin' },
          reason: `Edited fields: ${changes.map(c => c.label).join(', ')}`,
          changes,
          previousState: previousSnapshot,
          newState: sale.toObject()
        });
      } catch (err) {
        console.error('AuditLog error:', err);
      }
    }

    await sale.save();
    return sale;
  }

  static async deleteOfflineSale(id, user) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid record ID');
    const sale = await OfflineSale.findById(id);
    if (!sale) throw new Error('Offline sale not found');

    // Restore stock if it was deducted
    if (sale.inventoryDeducted && sale.items?.length > 0) {
      for (const item of sale.items) {
        if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity }
          });
        }
      }
      realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_restored' });
    }

    // Record Ultra-Lightweight Deletion Log (Date, Category, Title/ID, Amount - 0 heavy snapshot)
    try {
      await AuditLog.create({
        action: 'DELETED',
        entityType: 'OFFLINE_SALE',
        entityId: sale.saleId || sale.billNumber || sale._id.toString(),
        entityTitle: sale.customerName || 'Offline Retail Customer',
        amount: sale.totalAmount || 0
      });
    } catch (auditErr) {
      console.error('Failed to log deletion for offline sale:', auditErr);
    }

    await OfflineSale.findByIdAndDelete(id);
    return { success: true, message: 'Offline sale deleted and stock restored' };
  }

  // ==========================================
  // TAB 5: DELETION LOGS (Purged records from Offline Sales, Mfg, and Shop Overhead)
  // ==========================================
  static async getDeletionLogs({ period, startDate, endDate, entityType, search, page = 1, limit = 10 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const allowedEntities = ['OFFLINE_SALE', 'MANUFACTURING', 'OPERATING'];
    const query = {
      action: 'DELETED',
      entityType: { $in: allowedEntities }
    };

    if (entityType && allowedEntities.includes(entityType.toUpperCase())) {
      query.entityType = entityType.toUpperCase();
    }

    const dateQuery = this.getDateFilter(period, startDate, endDate);
    if (dateQuery.$gte || dateQuery.$lte) {
      query.createdAt = dateQuery;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { entityId: { $regex: term, $options: 'i' } },
        { entityTitle: { $regex: term, $options: 'i' } },
        { reason: { $regex: term, $options: 'i' } },
        { 'performedBy.name': { $regex: term, $options: 'i' } },
        { 'performedBy.email': { $regex: term, $options: 'i' } }
      ];
    }

    const [totalItems, logs, offlineSalesDeleted, mfgBatchesDeleted, operatingExpensesDeleted, valueAgg] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query).select('_id entityType entityId entityTitle amount createdAt').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      AuditLog.countDocuments({ action: 'DELETED', entityType: 'OFFLINE_SALE' }),
      AuditLog.countDocuments({ action: 'DELETED', entityType: 'MANUFACTURING' }),
      AuditLog.countDocuments({ action: 'DELETED', entityType: 'OPERATING' }),
      AuditLog.aggregate([
        { $match: { action: 'DELETED', entityType: { $in: allowedEntities } } },
        { $group: { _id: null, totalValue: { $sum: '$amount' } } }
      ])
    ]);

    const totalDeletions = offlineSalesDeleted + mfgBatchesDeleted + operatingExpensesDeleted;
    const totalDeletedValue = valueAgg[0]?.totalValue || 0;

    const formattedLogs = logs.map(log => {
      let title = log.entityTitle || 'Untitled Record';
      let id = log.entityId;

      // 1. Remove duplicate Bill / Sale ID from title in Offline Sales
      // e.g. "AAkib (Bill #OFF-2026-0001)" -> "AAkib"
      title = title.replace(/\s*\((?:Bill\s*#?|OFF-)[^)]+\)/gi, '').trim();

      // 2. Remove duplicate Batch ID from title in Manufacturing
      // e.g. "mmm - Batch BATCH-02 (mm)" -> "mmm (mm)"
      title = title.replace(/\s*-\s*Batch\s+[^\s(]+/gi, '').trim();

      // 3. Format Operating Expense ID if it's a raw 24-char MongoDB ObjectId
      if (log.entityType === 'OPERATING' && id && /^[0-9a-fA-F]{24}$/.test(id)) {
        const year = new Date(log.createdAt || Date.now()).getFullYear();
        id = `OVH-${year}-${id.slice(-4).toUpperCase()}`;
      }

      return {
        ...log,
        entityTitle: title,
        entityId: id
      };
    });

    return {
      success: true,
      logs: formattedLogs,
      metrics: {
        totalDeletions,
        offlineSalesDeleted,
        mfgBatchesDeleted,
        operatingExpensesDeleted,
        totalDeletedValue
      },
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum) || 1,
        totalItems,
        pageSize: limitNum
      }
    };
  }

}
