import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCMSStore } from '../../store/useCMSStore';

export const FAQAccordion: React.FC = () => {
  const { cms } = useCMSStore();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const defaultFaqs = [
    {
      question: 'When will I receive my order?',
      answer: 'Orders are dispatched within 24 business hours from our central facility in Sidhpur, Gujarat via India Post and trusted express courier partners. Metro cities typically receive delivery within 2 to 4 business days, and other regions across India within 4 to 6 business days. Free express shipping is provided on all eligible orders.'
    },
    {
      question: 'Is Cash on Delivery (COD) supported?',
      answer: 'Yes! We provide Cash on Delivery (COD). You can conveniently pay using cash or any UPI app (Google Pay, PhonePe, Paytm) directly at your doorstep when the delivery partner arrives.'
    },
    {
      question: 'Can I track my shipment live?',
      answer: 'Yes, absolutely! Once your parcel is dispatched, you will receive your India Post / courier consignment tracking number and direct tracking link via WhatsApp and email. You can also track your shipment live anytime directly from the \'My Orders\' section on our website.'
    },
    {
      question: 'How do I use the Oil and Shampoo combo together?',
      answer: 'Apply Novise Hair Growth Oil to your scalp in the evening and leave it overnight so the Ayurvedic herbs can repair your roots. Wash it off the next morning with Novise Anti-Dandruff Clarifying Shampoo. Repeat 2 to 3 times per week.'
    },
    {
      question: 'Are Novise products safe for colored or chemically treated hair?',
      answer: 'Yes, absolutely. All our formulations are 100% free from harsh sulfates, parabens, silicones, and synthetic drying alcohols, making them safe for color-treated and smoothened hair.'
    }
  ];

  const faqs = defaultFaqs;

  if (cms?.sectionVisibility?.showFaqs === false) {
    return null;
  }

  return (
    <section className="py-5 sm:py-10 bg-cream-100">
      <div className="w-full px-3.5 sm:px-6 lg:px-10 max-w-4xl mx-auto">

        <div className="text-center mb-8 sm:mb-12 space-y-2.5 sm:space-y-3">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-forest-800 bg-forest-900/10 px-3 py-1 rounded-full">
            Got Questions?
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl font-extrabold text-forest-950">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Everything you need to know about our products, delivery, and payments.
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 overflow-hidden transition-shadow shadow-sm hover:shadow"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-4 sm:px-6 py-3.5 sm:py-4 text-left flex items-center justify-between text-slate-900 font-bold text-xs sm:text-sm hover:text-forest-900 transition"
                >
                  <span className="pr-3 leading-snug">{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-forest-900' : ''
                      }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-50 animate-fadeIn font-normal">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
