import React, { useState, useEffect } from 'react';
import NoodleLogoIcon from './icons/NoodleLogoIcon';
import { Toast } from './Toast';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSuccess, addToast }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '8888') {
      onSuccess();
    } else {
      addToast({ type: 'error', message: '密碼錯誤，請再試一次！' });
      setError('密碼錯誤，請再試一次！'); // Keep inline error for immediate feedback
      setPassword('');
    }
  };
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900/80 border border-yellow-500/50 rounded-xl shadow-2xl w-full max-w-sm p-8 relative text-center"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 0 25px rgba(252, 211, 77, 0.3)' }}
      >
        <div className="flex justify-center mb-4">
          <NoodleLogoIcon className="w-20 h-20" />
        </div>
        <h3 className="text-2xl font-bold text-yellow-300 mb-2">解鎖天選之桶</h3>
        <p className="text-gray-400 text-sm mb-4">此為阿嬤純手打，可能產生 API 費用，請輸入密碼以繼續。</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 text-center text-lg text-gray-200 bg-black/50 border border-yellow-700/50 rounded-md focus:ring-yellow-500 focus:border-yellow-500 transition"
            placeholder="請輸入密碼"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            className="w-full mt-4 px-4 py-2 font-bold text-black bg-yellow-400 hover:bg-yellow-500 rounded-md transition-colors"
          >
            解鎖
          </button>
        </form>
         <button
          onClick={onClose}
          className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition"
        >
          取消
        </button>
      </div>
    </div>
  );
};

export default PasswordModal;