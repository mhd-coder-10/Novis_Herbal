import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  MapPin,
  Camera,
  Save,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  ShieldCheck,
  ArrowLeft,
  Package,
  Heart,
  Loader2,
  Check,
  LogOut,
  ChevronRight,
  Star,
  ExternalLink,
  Bell,
  ShoppingBag,
  Sparkles,
  Truck,
  CheckCircle,
  CheckCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { useNotificationStore, isNotificationActive } from '../../store/useNotificationStore';
import api, { getFullImageUrl } from '../../services/api';
import { AddressItem, Review, ReviewMedia } from '../../types';
import { toast } from '../../store/useToastStore';
import { sanitizePhoneNumber, isValidIndianPhone, handlePhoneKeyDown } from '../../utils/phoneValidation';
import { ReviewCard } from '../../components/storefront/ReviewCard';
import { ReviewModal } from '../../components/storefront/ReviewModal';
import { MediaLightbox } from '../../components/storefront/MediaLightbox';

const formatNotifTimeAgo = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
};

const getNotifIcon = (type: string) => {
  switch (type) {
    case 'STOCK_UPDATE':
    case 'BACK_IN_STOCK':
      return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
    case 'PRODUCT_LAUNCH':
    case 'NEW_PRODUCT':
    case 'PROMOTION':
      return <Sparkles className="w-4 h-4 text-gold-500" />;
    case 'ORDER_DISPATCHED':
      return <Truck className="w-4 h-4 text-amber-600" />;
    case 'ORDER_DELIVERED':
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    case 'ORDER_CONFIRMED':
    case 'ORDER_PACKED':
    case 'ORDER_PLACED':
      return <Package className="w-4 h-4 text-forest-800" />;
    case 'ORDER_CANCELLED':
    case 'CANCEL_REQUEST_APPROVED':
    case 'CANCEL_REQUEST_REJECTED':
      return <AlertCircle className="w-4 h-4 text-rose-600" />;
    case 'COMPLAINT_UPDATE':
    case 'COMPLAINT_SUBMITTED':
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    default:
      return <Bell className="w-4 h-4 text-forest-700" />;
  }
};

interface ProfilePageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, updateUser, logout } = useAuthStore();
  const { items: wishlistItems } = useWishlistStore();
  const {
    notifications,
    unreadCount,
    markUserRead,
    markAllUserRead,
    removeUserNotification,
    clearAllUserNotifications,
    openDrawer,
    fetchUserNotifications
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'details' | 'security' | 'addresses' | 'reviews' | 'notifications'>('details');

  const filteredProfileNotifications = notifications.filter(isNotificationActive);

  useEffect(() => {
    fetchUserNotifications(user?.email);
  }, [fetchUserNotifications, user?.email]);

  // Customer reviews state
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<ReviewMedia | null>(null);

  // Personal details state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Delete Account Confirmation Modal states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Email Password Reset inside Profile states
  const [isEmailResetModalOpen, setIsEmailResetModalOpen] = useState(false);
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [profileResetOtp, setProfileResetOtp] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileShowNewPass, setProfileShowNewPass] = useState(false);
  const [profileShowConfirmPass, setProfileShowConfirmPass] = useState(false);
  const [profileResetTimer, setProfileResetTimer] = useState(60);
  const [profileCanResend, setProfileCanResend] = useState(false);
  const [profileSimulatedOtp, setProfileSimulatedOtp] = useState<string | null>(null);
  const [profileResetError, setProfileResetError] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Address state
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressItem>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    isDefault: false
  });

  // UI state
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state with user data and fetch reviews
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
      setAddresses((user.addresses || []).slice(0, 1));
      fetchMyReviews();
    }
  }, [user]);

  const fetchMyReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const res = await api.get('/reviews/my');
      if (res.data?.success) {
        setMyReviews(res.data.reviews || []);
      }
    } catch (err) {
      console.error('Error fetching customer reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // Timer countdown for in-profile email reset OTP
  useEffect(() => {
    let interval: any = null;
    if (isEmailResetModalOpen && profileResetTimer > 0) {
      interval = setInterval(() => {
        setProfileResetTimer((prev) => prev - 1);
      }, 1000);
    } else if (profileResetTimer === 0) {
      setProfileCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isEmailResetModalOpen, profileResetTimer]);

  const handleEditMyReview = (rev: Review) => {
    if ((rev.editCount || 0) >= 1) {
      toast.warning('This review has already been edited once. Further edits are not allowed.', 'Edit Limit');
      return;
    }
    setEditingReview(rev);
    setIsReviewModalOpen(true);
  };

  const handleDeleteMyReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review? After deleting, you can write a fresh new review on the product.')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setMyReviews(prev => prev.filter(r => r._id !== reviewId));
      toast.info('Your review has been removed.', 'Review Removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete review', 'Delete Error');
    }
  };

  const handleReviewSubmitSuccess = (savedReview: Review, isEdit: boolean) => {
    if (isEdit) {
      setMyReviews(prev => prev.map(r => r._id === savedReview._id ? savedReview : r));
    } else {
      setMyReviews(prev => [savedReview, ...prev]);
    }
  };

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Handle Avatar upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please select a valid image file (JPG, PNG, WEBP)' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size should be less than 5MB' });
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsUploadingAvatar(true);
      const res = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data?.fileUrl) {
        const newAvatarUrl = res.data.fileUrl;
        setAvatar(newAvatarUrl);
        // Persist immediately to profile
        const updateRes = await api.put('/auth/profile', { avatar: newAvatarUrl });
        if (updateRes.data?.user) {
          updateUser({ avatar: newAvatarUrl });
        }
        setFeedback({ type: 'success', message: 'Profile picture updated successfully!' });
        toast.success('Profile picture updated successfully!', 'Profile');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to upload photo. Please try again.';
      setFeedback({ type: 'error', message: msg });
      toast.error(msg, 'Upload Failed');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Avatar Removal & Profile
  const handleRemoveAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    try {
      setIsUploadingAvatar(true);
      await api.delete('/upload/avatar');
      setAvatar('');
      updateUser({ avatar: '' });
      setFeedback({ type: 'success', message: 'Profile picture removed successfully!' });
      toast.success('Profile picture removed successfully!', 'Profile');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to remove photo.';
      setFeedback({ type: 'error', message: msg });
      toast.error(msg, 'Error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle Permanent Account Deletion Modal with Password Verification
  const handleOpenDeleteDialog = () => {
    setDeletePassword('');
    setDeletePasswordError('');
    setShowDeletePassword(false);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletePasswordError('');

    if (!deletePassword) {
      setDeletePasswordError('Please enter your current password to confirm account deletion.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      // Support both /auth/delete-account POST and /auth/profile DELETE
      const res = await api.post('/auth/delete-account', {
        password: deletePassword
      });

      if (res.data?.success) {
        toast.success('Your account and profile assets have been permanently deleted.');
        setIsDeleteDialogOpen(false);
        logout();
        onNavigate('home');
      } else {
        const errorMsg = res.data?.message || 'Incorrect password. Account deletion aborted.';
        setDeletePasswordError(errorMsg);
        toast.error(errorMsg, 'Deletion Failed');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Incorrect password. Account deletion aborted.';
      setDeletePasswordError(errorMsg);
      toast.error(errorMsg, 'Deletion Failed');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Handle In-Profile Password Reset via Email Recovery
  const handleOpenEmailResetModal = async () => {
    if (!user?.email) return;
    setProfileResetError('');
    setIsSendingResetOtp(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: user.email });
      if (res.data?.success) {
        if (res.data?.simulatedOtp) {
          setProfileSimulatedOtp(res.data.simulatedOtp);
        }
        setProfileResetOtp('');
        setProfileNewPassword('');
        setProfileConfirmPassword('');
        setProfileResetTimer(60);
        setProfileCanResend(false);
        setIsEmailResetModalOpen(true);
        toast.info(`Recovery OTP sent to ${user.email}`, 'Reset Code Sent');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send recovery code', 'Error');
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleResendProfileResetOtp = async () => {
    if (!profileCanResend || isSendingResetOtp || !user?.email) return;
    setProfileResetError('');
    setIsSendingResetOtp(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: user.email });
      if (res.data?.success) {
        if (res.data?.simulatedOtp) {
          setProfileSimulatedOtp(res.data.simulatedOtp);
        }
        setProfileResetTimer(60);
        setProfileCanResend(false);
        setProfileResetOtp('');
        toast.success(`A new recovery OTP code has been sent to ${user.email}.`, 'Code Resent');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend code', 'Resend Failed');
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleConfirmEmailResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileResetError('');

    if (!profileResetOtp || profileResetOtp.trim().length < 6) {
      setProfileResetError('Please enter the complete 6-digit OTP sent to your email.');
      return;
    }

    if (profileNewPassword.length < 6) {
      setProfileResetError('New password must be at least 6 characters.');
      return;
    }

    if (profileNewPassword !== profileConfirmPassword) {
      setProfileResetError('New password and confirm password do not match.');
      return;
    }

    try {
      setIsSubmittingReset(true);
      const res = await api.post('/auth/reset-password', {
        email: user?.email,
        otp: profileResetOtp.trim(),
        newPassword: profileNewPassword
      });

      if (res.data?.success) {
        toast.success('Your password has been reset successfully! Your new password is now active.', 'Password Updated');
        setIsEmailResetModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFeedback({
          type: 'success',
          message: 'Password reset verified via email! Your new password is now active.'
        });
      } else {
        setProfileResetError(res.data?.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      setProfileResetError(errorMsg);
      toast.error(errorMsg, 'Reset Failed');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Handle Personal Details Save
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Name cannot be empty' });
      toast.warning('Name cannot be empty', 'Validation');
      return;
    }

    const cleanPhone = sanitizePhoneNumber(phone);
    if (cleanPhone && !isValidIndianPhone(cleanPhone)) {
      const err = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
      setFeedback({ type: 'error', message: err });
      toast.warning(err, 'Invalid Mobile Number');
      return;
    }

    try {
      setIsSavingDetails(true);
      const res = await api.put('/auth/profile', {
        name: name.trim(),
        phone: cleanPhone
      });

      if (res.data?.success) {
        updateUser({
          name: name.trim(),
          phone: cleanPhone
        });
        setFeedback({ type: 'success', message: 'Profile details saved successfully!' });
        toast.success('Profile details saved successfully!', 'Profile Updated');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile.';
      setFeedback({ type: 'error', message: msg });
      toast.error(msg, 'Update Error');
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setFeedback({ type: 'error', message: 'Please enter your current password' });
      toast.warning('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'New password must be at least 6 characters' });
      toast.warning('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New password and confirm password do not match' });
      toast.warning('New password and confirm password do not match');
      return;
    }

    try {
      setIsSavingPassword(true);
      const res = await api.put('/auth/profile', {
        currentPassword,
        newPassword
      });

      if (res.data?.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFeedback({ type: 'success', message: 'Password updated successfully! Your account is safe.' });
        toast.success('Password updated successfully! Your account is secure.', 'Security');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update password.';
      setFeedback({ type: 'error', message: msg });
      toast.error(msg, 'Password Error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle Save Address (Create or Edit single address)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.fullName.trim() || !addressForm.phone.trim() || !addressForm.addressLine1.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.pincode.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in all required address fields' });
      toast.warning('Please fill in all required address fields');
      return;
    }

    const cleanAddressPhone = sanitizePhoneNumber(addressForm.phone);
    if (!isValidIndianPhone(cleanAddressPhone)) {
      const err = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
      setFeedback({ type: 'error', message: err });
      toast.warning(err, 'Invalid Mobile Number');
      return;
    }

    const cleanPincode = addressForm.pincode.replace(/\D/g, '').slice(0, 6);
    if (cleanPincode.length !== 6) {
      const err = 'Pincode must be exactly 6 digits.';
      setFeedback({ type: 'error', message: err });
      toast.warning(err, 'Invalid Pincode');
      return;
    }

    const sanitizedAddress: AddressItem = {
      fullName: addressForm.fullName.trim(),
      phone: cleanAddressPhone,
      addressLine1: addressForm.addressLine1.trim(),
      addressLine2: (addressForm.addressLine2 || '').trim(),
      landmark: (addressForm.landmark || '').trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      pincode: cleanPincode,
      country: 'India',
      isDefault: true
    };

    // User can strictly only have 1 delivery address
    const updatedList = [sanitizedAddress];

    try {
      setIsSavingAddress(true);
      const res = await api.put('/auth/profile', { addresses: updatedList });
      if (res.data?.success) {
        setAddresses(updatedList);
        updateUser({ addresses: updatedList });
        setIsEditingAddress(false);
        setEditingAddressIndex(null);
        setFeedback({ type: 'success', message: 'Delivery address saved successfully!' });
        toast.success('Delivery address saved successfully!', 'Address Book');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save address.';
      setFeedback({ type: 'error', message: msg });
      toast.error(msg, 'Address Error');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Handle Delete Address
  const handleDeleteAddress = async () => {
    if (!confirm('Are you sure you want to delete your saved delivery address? Once removed, you can add a new one.')) return;

    const updatedList: AddressItem[] = [];

    try {
      setIsSavingAddress(true);
      const res = await api.put('/auth/profile', { addresses: updatedList });
      if (res.data?.success) {
        setAddresses(updatedList);
        updateUser({ addresses: updatedList });
        setIsEditingAddress(false);
        setEditingAddressIndex(null);
        setFeedback({ type: 'success', message: 'Delivery address removed successfully. You can now add a new address.' });
        toast.info('Delivery address removed. You can now add a new address.', 'Address Book');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete address.';
      setFeedback({ type: 'error', message: msg });
      toast.error(msg, 'Delete Error');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Open New Address Form (Only allowed if no address exists)
  const openNewAddressForm = () => {
    if (addresses.length > 0) {
      toast.warning('You already have a delivery address saved. You can edit it or delete it to add a new one.', 'Single Address Limit');
      return;
    }
    setAddressForm({
      fullName: user?.name || '',
      phone: user?.phone || '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      isDefault: true
    });
    setEditingAddressIndex(null);
    setIsEditingAddress(true);
  };

  // Open Edit Address Form
  const openEditAddressForm = () => {
    if (addresses.length > 0) {
      setAddressForm({ ...addresses[0], isDefault: true });
      setEditingAddressIndex(0);
      setIsEditingAddress(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="py-12 sm:py-20 w-full px-3.5 sm:px-6 lg:px-10">
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-luxury border border-slate-200/80 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-forest-900/10 text-forest-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-forest-950 mb-2">Account Required</h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6">
            Please log in or create an account to view and edit your profile, saved addresses, and security settings.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-3.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl text-sm transition shadow-md hover:shadow-lg"
          >
            Sign In to Your Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-14">
      {/* 100% Matching Container with ShopPage & WishlistPage */}
      <div className="w-full px-3.5 sm:px-6 lg:px-10 space-y-6 sm:space-y-8">

        {/* Centered Page Header matching ShopPage & WishlistPage */}
        <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
          <div className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-forest-900 bg-forest-900/10 px-3.5 py-1 rounded-full shadow-sm">
            <UserIcon className="w-3.5 h-3.5 text-forest-800" />
            <span>Customer Account</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
            My Profile & Settings
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Manage your personal details, profile avatar, delivery addresses, and account security.
          </p>
        </div>

        {/* Floating Toast Notification */}
        {feedback && (
          <div className={`p-4 rounded-2xl flex items-center space-x-3 border shadow-md animate-fadeIn transition max-w-3xl mx-auto ${feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-semibold">{feedback.message}</p>
          </div>
        )}

        {/* Symmetrical 12-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* LEFT COLUMN: Profile Sidebar & Navigation (4 cols) */}
          <div className="lg:col-span-4 space-y-5">

            {/* User Identity Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-forest-900 via-gold-500 to-forest-900" />

              {/* Avatar with Camera Icon */}
              <div className="relative inline-block mt-2 mb-4 group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gradient-to-br from-forest-900 to-forest-800 flex items-center justify-center text-gold-400 font-serif font-black text-3xl shadow-md border-4 border-white">
                  {avatar ? (
                    <img
                      src={getFullImageUrl(avatar)}
                      alt={name || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(name || user?.name || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Upload Button Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 p-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 rounded-full shadow-lg border-2 border-white transition transform group-hover:scale-110"
                  title="Change profile picture"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                {/* Remove Avatar Button (Cloudinary NOVISE_HERBAL/users cleanup) */}
                {avatar && !isUploadingAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg border-2 border-white transition transform group-hover:scale-110"
                    title="Remove profile picture"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </div>

              {/* Name & Badges */}
              <h2 className="text-xl font-serif font-bold text-forest-950 leading-snug">
                {user?.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>

              <div className="flex items-center justify-center space-x-2 mt-2">
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10.5px] font-bold rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Customer</span>
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                  {user?.role}
                </span>
              </div>

              {/* Quick Numbers Bar */}
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
                <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-slate-200/60">
                  <span className="block text-base font-black text-forest-950">{addresses.length > 0 ? 1 : 0}</span>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500">Address</span>
                </div>
                <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-slate-200/60">
                  <span className="block text-base font-black text-rose-600">{wishlistItems.length}</span>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500">Wishlist</span>
                </div>
                <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-slate-200/60">
                  <span className="block text-base font-black text-forest-950">Active</span>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500">Status</span>
                </div>
              </div>

              {/* Admin Portal Shortcut (Only visible when logged in as Admin) */}
              {user?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin-dashboard')}
                  className="w-full mt-4 py-2.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-md transition transform hover:scale-[1.02]"
                >
                  <Shield className="w-4 h-4 text-white" />
                  <span>Open Admin Portal</span>
                </button>
              )}
            </div>

            {/* Vertical Navigation Tabs */}
            <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-sm space-y-1">
              {/* Admin Portal Tab (Only visible when logged in as Admin) */}
              {user?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin-dashboard')}
                  className="w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center justify-between bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100/90 shadow-xs mb-2"
                >
                  <div className="flex items-center space-x-3">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>Admin Portal</span>
                  </div>
                  <span className="text-[10px] bg-amber-600 text-white font-mono uppercase px-2 py-0.5 rounded-full font-bold">
                    Dashboard
                  </span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('details')}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-between ${activeTab === 'details'
                  ? 'bg-forest-900 text-gold-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-4 h-4" />
                  <span>Personal Details</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeTab === 'details' ? 'text-gold-400' : 'text-slate-400'}`} />
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-between ${activeTab === 'security'
                  ? 'bg-forest-900 text-gold-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Lock className="w-4 h-4" />
                  <span>Password & Security</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeTab === 'security' ? 'text-gold-400' : 'text-slate-400'}`} />
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-between ${activeTab === 'addresses'
                  ? 'bg-forest-900 text-gold-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4" />
                  <span>Delivery Address</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'addresses' ? 'bg-gold-400/20 text-gold-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {addresses.length > 0 ? 1 : 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('reviews')}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-between ${activeTab === 'reviews'
                  ? 'bg-forest-900 text-gold-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Star className="w-4 h-4" />
                  <span>My Reviews</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'reviews' ? 'bg-gold-400/20 text-gold-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {myReviews.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-between ${activeTab === 'notifications'
                  ? 'bg-forest-900 text-gold-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Bell className="w-4 h-4" />
                  <span>In-App Notifications</span>
                </div>
                {unreadCount > 0 ? (
                  <span className="text-[10px] bg-amber-600 text-white font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'notifications' ? 'bg-gold-400/20 text-gold-300' : 'bg-slate-100 text-slate-600'}`}>
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Storefront Shortcuts */}
              <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                <button
                  onClick={() => onNavigate('my-orders')}
                  className="w-full text-left px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-between transition"
                >
                  <div className="flex items-center space-x-3">
                    <Package className="w-4 h-4 text-forest-800" />
                    <span>My Past Orders</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => onNavigate('wishlist')}
                  className="w-full text-left px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-between transition"
                >
                  <div className="flex items-center space-x-3">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span>Saved Wishlist ({wishlistItems.length})</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2.5 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-3 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Active Tab Panel (8 cols - fills full width) */}
          <div className="lg:col-span-8">

            {/* TAB 1: PERSONAL DETAILS */}
            {activeTab === 'details' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm animate-fadeIn">
                <div className="pb-4 mb-6 border-b border-slate-100">
                  <h3 className="text-xl font-serif font-bold text-forest-950">
                    Edit Personal Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Keep your contact information up to date for smooth dispatch and delivery notifications.
                  </p>
                </div>

                <form onSubmit={handleSaveDetails} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider mb-2">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          placeholder="e.g. Rahul Sharma"
                          className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider">
                          Mobile Number
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {phone ? `${phone.length}/10 digits` : '10 digits'}
                        </span>
                      </div>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-slate-400 font-bold text-xs">
                          <Phone className="w-4 h-4" />
                          <span>+91</span>
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[6-9][0-9]{9}"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))}
                          onKeyDown={handlePhoneKeyDown}
                          placeholder="9876543210"
                          className="w-full pl-16 pr-4 py-3 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white transition font-mono tracking-wider"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider mb-2">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={user?.email}
                        disabled
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1.5 block">
                      Email address is permanently linked with your verified Novise account.
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingDetails}
                      className="px-8 py-3 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-md disabled:opacity-50"
                    >
                      {isSavingDetails ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: SECURITY & PASSWORD */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm animate-fadeIn">
                <div className="pb-4 mb-6 border-b border-slate-100">
                  <h3 className="text-xl font-serif font-bold text-forest-950">
                    Change Password
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    To update your password, enter your current password followed by your new password.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider mb-2">
                      Current Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Enter current password"
                        className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider mb-2">
                        New Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                          placeholder="Minimum 6 characters"
                          className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider mb-2">
                        Confirm New Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          placeholder="Re-enter new password"
                          className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingPassword}
                      className="px-8 py-3 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-md disabled:opacity-50"
                    >
                      {isSavingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>

                {/* Section 2: Reset Password via Email */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/80 to-amber-100/50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300/50 shadow-xs">
                        <KeyRound className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-forest-950">
                          Don't remember your current password?
                        </h4>
                        <p className="text-[11px] text-amber-900/80 leading-relaxed mt-0.5">
                          You can easily reset and create a new password via a 6-digit OTP sent to your registered email (<strong>{user?.email}</strong>).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSendingResetOtp}
                      onClick={handleOpenEmailResetModal}
                      className="px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl text-xs transition shadow-sm shrink-0 flex items-center justify-center space-x-2 disabled:opacity-50 whitespace-nowrap"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{isSendingResetOtp ? 'Sending OTP...' : 'Reset Password via Email'}</span>
                    </button>
                  </div>
                </div>

                {/* Section 3: Danger Zone: Permanent Account Deletion */}
                <div className="mt-8 pt-6 border-t border-rose-100">
                  <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
                    Danger Zone
                  </h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Permanently delete your account, order history, and stored profile assets. This action cannot be reversed.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenDeleteDialog}
                    className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Delete Account Permanently</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: SAVED DELIVERY ADDRESS (Max 1 Address) */}
            {activeTab === 'addresses' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-forest-950">
                      Saved Delivery Address
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Your primary delivery address used for automatic autofill at checkout.
                    </p>
                  </div>
                  {addresses.length === 0 && !isEditingAddress && (
                    <button
                      onClick={openNewAddressForm}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl text-xs sm:text-sm transition shadow-md self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Delivery Address</span>
                    </button>
                  )}
                </div>

                {/* Address Form (Add or Edit) */}
                {isEditingAddress && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border-2 border-forest-900/20 animate-fadeIn">
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                      <h4 className="text-base font-serif font-bold text-forest-950">
                        {addresses.length > 0 ? 'Edit Delivery Address' : 'Add Delivery Address'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAddress(false);
                          setEditingAddressIndex(null);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleSaveAddress} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-forest-950 mb-1">
                            Receiver Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.fullName}
                            onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                            required
                            placeholder="e.g. Rahul Sharma"
                            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-forest-950">
                              Mobile Number <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {addressForm.phone ? `${addressForm.phone.length}/10` : '10 digits'}
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              pattern="[6-9][0-9]{9}"
                              value={addressForm.phone}
                              onChange={(e) => setAddressForm({ ...addressForm, phone: sanitizePhoneNumber(e.target.value) })}
                              onKeyDown={handlePhoneKeyDown}
                              required
                              placeholder="9876543210"
                              maxLength={10}
                              className="w-full pl-11 pr-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white font-mono tracking-wider"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-forest-950 mb-1">
                          Flat, House no., Building, Company, Apartment <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.addressLine1}
                          onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                          required
                          placeholder="e.g. Flat 402, Green Valley Heights"
                          className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-forest-950 mb-1">
                            Area, Street, Sector, Village
                          </label>
                          <input
                            type="text"
                            value={addressForm.addressLine2 || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                            placeholder="e.g. MG Road, Near City Mall"
                            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-forest-950 mb-1">
                            Landmark
                          </label>
                          <input
                            type="text"
                            value={addressForm.landmark || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                            placeholder="e.g. Opposite Metro Pillar 14"
                            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-forest-950 mb-1">
                            City / Town <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            required
                            placeholder="e.g. Mumbai"
                            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-forest-950 mb-1">
                            State <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            required
                            placeholder="e.g. Maharashtra"
                            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-forest-950 mb-1">
                            Pincode <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.pincode}
                            onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                            required
                            placeholder="400001"
                            maxLength={6}
                            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs sm:text-sm text-forest-950 focus:outline-none focus:border-forest-800 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 pt-3">
                        <button
                          type="submit"
                          disabled={isSavingAddress}
                          className="px-6 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl text-xs sm:text-sm transition flex items-center space-x-2 shadow-md disabled:opacity-50"
                        >
                          {isSavingAddress ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          <span>{addresses.length > 0 ? 'Update Address' : 'Save Address'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingAddress(false);
                            setEditingAddressIndex(null);
                          }}
                          className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Address Display */}
                {addresses.length === 0 && !isEditingAddress ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-sm max-w-lg mx-auto">
                    <div className="w-14 h-14 rounded-full bg-forest-900/10 text-forest-900 flex items-center justify-center mx-auto mb-3">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-serif font-bold text-forest-950 mb-1">
                      No Saved Delivery Address
                    </h4>
                    <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                      Save your delivery address once to get automatic autofill at checkout.
                    </p>
                    <button
                      onClick={openNewAddressForm}
                      className="px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl text-xs transition shadow-md inline-flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Delivery Address</span>
                    </button>
                  </div>
                ) : !isEditingAddress && addresses.length > 0 ? (
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-forest-900/25 ring-1 ring-forest-900/10 shadow-sm transition">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                          <span className="font-bold text-base text-forest-950">
                            {addresses[0].fullName}
                          </span>
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-forest-900 text-gold-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                            <Check className="w-3 h-3" />
                            <span>Primary Delivery Address</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-2 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>+91 {addresses[0].phone}</span>
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 self-start">
                        <button
                          type="button"
                          onClick={() => openEditAddressForm()}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-50 hover:bg-forest-50 border border-slate-200 text-forest-950 text-xs font-bold rounded-xl transition"
                          title="Edit Address"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-forest-800" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteAddress}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition"
                          title="Delete Address"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed bg-[#FAF8F5] p-4 rounded-2xl border border-slate-200/60">
                      <p className="font-semibold text-forest-950">
                        {addresses[0].addressLine1}
                      </p>
                      {addresses[0].addressLine2 && (
                        <p>{addresses[0].addressLine2}</p>
                      )}
                      {addresses[0].landmark && (
                        <p className="text-slate-500"><span className="font-medium text-slate-700">Landmark:</span> Near {addresses[0].landmark}</p>
                      )}
                      <p className="font-bold text-forest-900 pt-1">
                        {addresses[0].city}, {addresses[0].state} - {addresses[0].pincode}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-4">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>Only 1 delivery address is saved per account. To add a different address, edit this one or delete it first.</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Tab 4: My Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest-950">
                    My Product Reviews & Ratings
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage your verified customer reviews. You can edit each review once, or delete it anytime.
                  </p>
                </div>

                {isLoadingReviews ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-forest-900 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading your reviews...</p>
                  </div>
                ) : myReviews.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-sm max-w-lg mx-auto">
                    <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-base font-serif font-bold text-forest-950 mb-1">
                      No Product Reviews Yet
                    </h4>
                    <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                      You haven't written any product reviews yet. Share your experience with your favorite Novise formulations!
                    </p>
                    <button
                      onClick={() => onNavigate('shop')}
                      className="px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl text-xs transition shadow-md inline-flex items-center space-x-2"
                    >
                      <span>Explore Formulations</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {myReviews.map((rev) => {
                      const prod = typeof rev.product === 'object' && rev.product ? rev.product : null;
                      const prodSlug = prod?.slug || 'novise-hair-oil-shampoo-combo';
                      const prodImage = prod?.images?.[0] ? getFullImageUrl(prod.images[0]) : '/placeholder-product.png';

                      return (
                        <div
                          key={rev._id}
                          className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4 hover:border-slate-300 transition"
                        >
                          {/* Product header info */}
                          {prod && (
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={prodImage}
                                  alt={prod.name}
                                  className="w-12 h-12 object-cover rounded-xl border border-slate-200 bg-[#FAF8F5]"
                                />
                                <div>
                                  <h4 className="font-serif font-bold text-xs sm:text-sm text-forest-950 line-clamp-1">
                                    {prod.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    ₹{prod.sellingPrice} {prod.volumeText && `• ${prod.volumeText}`}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => onNavigate('product-detail', prodSlug)}
                                className="inline-flex items-center space-x-1 text-xs font-bold text-forest-900 hover:text-forest-950 underline underline-offset-2"
                              >
                                <span>View Product</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Review Card */}
                          <ReviewCard
                            review={rev}
                            isOwner={true}
                            onEdit={handleEditMyReview}
                            onDelete={handleDeleteMyReview}
                            onOpenMedia={(m) => setLightboxMedia(m)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: IN-APP NOTIFICATIONS CENTER */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm animate-fadeIn space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest-950 flex items-center space-x-2.5">
                      <span>Store & Order Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-amber-600 text-white font-extrabold px-2.5 py-0.5 rounded-full">
                          {unreadCount} unread
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Real-time updates regarding your dispatch status, tracking consignment numbers, refunds, and botanical announcements.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllUserRead}
                        className="px-3.5 py-2 bg-forest-900/10 hover:bg-forest-900/20 text-forest-950 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all as read</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllUserNotifications}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                        title="Clear all notifications"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear all</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                {filteredProfileNotifications.length === 0 ? (
                  <div className="py-16 text-center px-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Bell className="w-6 h-6 text-slate-400" />
                    </div>
                    <h4 className="font-serif text-base font-bold text-slate-800">No notifications found</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      When your orders are confirmed, dispatched, or out for delivery, you'll see all real-time updates here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProfileNotifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => {
                          if (!notif.isRead) markUserRead(notif._id);
                          if (notif.actionUrl) {
                            if (notif.actionUrl.startsWith('/my-orders')) onNavigate('my-orders');
                            else if (notif.actionUrl.startsWith('/shop')) onNavigate('shop');
                          }
                        }}
                        className={`p-4 sm:p-5 rounded-2xl border transition flex items-start space-x-3.5 cursor-pointer relative ${notif.isRead
                          ? 'bg-white border-slate-200/90 hover:border-forest-900/40 hover:bg-slate-50/50'
                          : 'bg-gradient-to-r from-amber-50/70 to-white border-amber-300 shadow-xs hover:shadow-md'
                          }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                          {getNotifIcon(notif.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-xs sm:text-sm font-bold truncate ${notif.isRead ? 'text-slate-800' : 'text-forest-950 font-black'}`}>
                              {notif.title}
                            </h4>
                            <div className="flex items-center space-x-2 shrink-0">
                              {notif.priority === 'HIGH' && (
                                <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                  Important
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatNotifTimeAgo(notif.createdAt)}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            {notif.message}
                          </p>

                          {notif.data?.trackingNumber && (
                            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs font-mono">
                              <span className="text-slate-600">
                                Consignment: <strong className="text-forest-950 font-sans">{notif.data.trackingNumber}</strong>
                              </span>
                              {notif.data.trackingUrl && (
                                <a
                                  href={notif.data.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-forest-900 hover:text-gold-700 font-bold font-sans flex items-center space-x-1"
                                >
                                  <span>Track Parcel</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                            <span className="text-[11px] text-forest-900 font-bold hover:underline flex items-center space-x-1">
                              <span>{notif.actionUrl ? 'Open Details' : 'View Update'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                            {!notif.isRead && (
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-xs" title="Unread" />
                            )}
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeUserNotification(notif._id);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                                title="Remove notification"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {!notif.isRead && (
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-xs" title="Unread" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Review Edit Modal in Profile */}
            {editingReview && (
              <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => {
                  setIsReviewModalOpen(false);
                  setEditingReview(null);
                }}
                user={user}
                productId={
                  typeof editingReview.product === 'string'
                    ? editingReview.product
                    : editingReview.product?._id
                }
                productName={
                  typeof editingReview.product === 'object' && editingReview.product
                    ? editingReview.product.name
                    : 'Product Review'
                }
                existingReview={editingReview}
                onSubmitSuccess={handleReviewSubmitSuccess}
              />
            )}

            {/* Media Lightbox */}
            <MediaLightbox
              media={lightboxMedia}
              onClose={() => setLightboxMedia(null)}
            />

            {/* Delete Account Password Verification Modal */}
            {isDeleteDialogOpen && typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => !isDeletingAccount && setIsDeleteDialogOpen(false)}
                />
                <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-100 z-10 animate-scaleUp">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6" />
                  </div>

                  <div className="text-center space-y-2 mb-6">
                    <h3 className="text-lg font-serif font-bold text-slate-900">
                      Confirm Account Deletion
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This action is permanent and cannot be undone. All your orders, saved addresses, wishlist, and profile photo will be permanently deleted.
                    </p>
                  </div>

                  {deletePasswordError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{deletePasswordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmDeleteAccount} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">
                        Enter Current Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showDeletePassword ? 'text' : 'password'}
                          required
                          autoFocus
                          placeholder="Enter your current password"
                          value={deletePassword}
                          onChange={(e) => {
                            setDeletePassword(e.target.value);
                            if (deletePasswordError) setDeletePasswordError('');
                          }}
                          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDeletePassword(!showDeletePassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 transition"
                          title={showDeletePassword ? 'Hide password' : 'Show password'}
                        >
                          {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        type="button"
                        disabled={isDeletingAccount}
                        onClick={() => setIsDeleteDialogOpen(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-stone-50 hover:bg-stone-100 font-bold text-slate-700 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isDeletingAccount || !deletePassword}
                        className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50"
                      >
                        {isDeletingAccount ? (
                          <span>Verifying & Deleting...</span>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Confirm Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}

            {/* Email Reset Password Modal inside Profile */}
            {isEmailResetModalOpen && typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => !isSubmittingReset && setIsEmailResetModalOpen(false)}
                />
                <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-amber-100 z-10 animate-scaleUp">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-6 h-6" />
                  </div>

                  <div className="text-center space-y-2 mb-6">
                    <h3 className="text-lg font-serif font-bold text-slate-900">
                      Reset Password via Email
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      A 6-digit recovery code has been sent to <strong className="text-forest-900">{user?.email}</strong>. Enter the OTP code below along with your new password.
                    </p>
                  </div>

                  {profileSimulatedOtp && (
                    <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center space-x-1.5">
                          <span>🔑 Local Reset OTP:</span>
                          <span className="font-mono text-sm bg-amber-200/80 px-2 py-0.5 rounded-lg font-black tracking-widest text-amber-950">
                            {profileSimulatedOtp}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setProfileResetOtp(profileSimulatedOtp)}
                          className="text-[10px] bg-amber-600 text-white px-2.5 py-1 rounded-md font-extrabold uppercase hover:bg-amber-700 transition shadow-sm"
                        >
                          Auto Fill
                        </button>
                      </div>
                    </div>
                  )}

                  {profileResetError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{profileResetError}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmEmailResetPassword} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-center text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                        6-Digit Recovery OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        required
                        placeholder="• • • • • •"
                        value={profileResetOtp}
                        onChange={(e) => {
                          setProfileResetOtp(e.target.value.replace(/[^0-9]/g, ''));
                          if (profileResetError) setProfileResetError('');
                        }}
                        className="w-full py-3 text-center text-2xl font-bold tracking-[8px] text-forest-950 border-2 border-forest-900/20 rounded-xl bg-[#FAF8F5] focus:outline-none focus:border-forest-900 font-mono shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={profileShowNewPass ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="Minimum 6 characters"
                          value={profileNewPassword}
                          onChange={(e) => setProfileNewPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900"
                        />
                        <button
                          type="button"
                          onClick={() => setProfileShowNewPass(!profileShowNewPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          title={profileShowNewPass ? 'Hide password' : 'Show password'}
                        >
                          {profileShowNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={profileShowConfirmPass ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="Re-enter new password"
                          value={profileConfirmPassword}
                          onChange={(e) => setProfileConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900"
                        />
                        <button
                          type="button"
                          onClick={() => setProfileShowConfirmPass(!profileShowConfirmPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          title={profileShowConfirmPass ? 'Hide password' : 'Show password'}
                        >
                          {profileShowConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Resend code */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Didn't receive the OTP?</span>
                      <button
                        type="button"
                        disabled={!profileCanResend || isSendingResetOtp}
                        onClick={handleResendProfileResetOtp}
                        className={`font-semibold ${profileCanResend ? 'text-forest-900 hover:underline' : 'text-slate-400 cursor-not-allowed'}`}
                      >
                        {profileCanResend ? 'Resend OTP' : `Resend in ${profileResetTimer}s`}
                      </button>
                    </div>

                    <div className="flex items-center space-x-3 pt-3">
                      <button
                        type="button"
                        disabled={isSubmittingReset}
                        onClick={() => setIsEmailResetModalOpen(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-stone-50 hover:bg-stone-100 font-bold text-slate-700 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReset || profileResetOtp.length < 6 || profileNewPassword.length < 6}
                        className="flex-1 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold transition flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
                      >
                        {isSubmittingReset ? (
                          <span>Verifying...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Set New Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
