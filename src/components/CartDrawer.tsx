import { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  onOrderComplete: (message: string) => void;
}

export function CartDrawer({ isOpen, onClose, customerName, onOrderComplete }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, subtotal, shipping, total, clearCart } = useCart();
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
  });

  const handleCheckout = () => {
    setFormData({ fullName: customerName || '', phone: '', address: '' });
    setStep('checkout');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderNumber = `GLW-${Date.now()}`;
      const orderData = {
        order_number: orderNumber,
        customer_name: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        items: items.map((item: CartItem) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        })),
        total,
        status: 'pending',
      };

      const { error } = await supabase.from('orders').insert(orderData);

      if (error) throw error;

      const successMessage = `Pesanan kamu berhasil dibuat!

No. Order: #${orderNumber}
Total: Rp${total.toLocaleString('id-ID')}

Detail Pesanan:
${items.map((item: CartItem) => `- ${item.name} x${item.quantity} = Rp${(item.price * item.quantity).toLocaleString('id-ID')}`).join('\n')}
Ongkos Kirim: Rp${shipping.toLocaleString('id-ID')}

Kami akan menghubungi kamu di ${formData.phone} untuk konfirmasi pembayaran.

Terima kasih telah berbelanja di GlowBot!`;

      onOrderComplete(successMessage);
      clearCart();
      setStep('success');
    } catch (err) {
      console.error('Order error:', err);
      alert('Terjadi kesalahan saat memproses pesanan. Silakan coba lagi.');
    }

    setLoading(false);
  };

  const handleClose = () => {
    setStep('cart');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-pink-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-pink-500" />
            <h2 className="font-semibold text-gray-800">
              {step === 'cart' && 'Keranjang Belanja'}
              {step === 'checkout' && 'Checkout'}
              {step === 'success' && 'Pesanan Berhasil'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-pink-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-pink-200 mx-auto mb-4" />
                  <p className="text-gray-500">Keranjang masih kosong</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                        <p className="text-sm font-semibold text-pink-500 mt-1">
                          Rp{item.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-white border border-pink-200 flex items-center justify-center hover:bg-pink-50"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-white border border-pink-200 flex items-center justify-center hover:bg-pink-50"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 ml-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-pink-100 p-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>Rp{subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Ongkos Kirim</span>
                  <span>Rp{shipping.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800 pt-2 border-t border-pink-100">
                  <span>Total</span>
                  <span className="text-pink-500">Rp{total.toLocaleString('id-ID')}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium shadow-md hover:shadow-lg transition-all"
                >
                  Checkout Sekarang
                </button>
              </div>
            )}
          </>
        )}

        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Pengiriman</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 resize-none"
                  required
                />
              </div>

              {/* Order Summary */}
              <div className="bg-pink-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-800 mb-3">Ringkasan Pesanan</h3>
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span>Rp{(item.price * item.quantity).toLocaleString('id-ID')}</span>
                  </div>
                ))}
                <div className="border-t border-pink-200 mt-2 pt-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>Rp{subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Ongkos Kirim</span>
                    <span>Rp{shipping.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-pink-500 mt-2">
                    <span>Total</span>
                    <span>Rp{total.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-pink-100 space-y-2">
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="w-full py-3 rounded-xl border-2 border-pink-200 text-gray-700 font-medium hover:bg-pink-50 transition-colors"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Konfirmasi Pesanan'
                )}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Pesanan Berhasil!</h3>
            <p className="text-gray-600 mb-6">Kamu akan menerima konfirmasi di chat.</p>
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
