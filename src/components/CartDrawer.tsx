import { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, Loader2, QrCode, Smartphone, Building2 } from 'lucide-react';
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

const paymentMethods = [
  { id: 'qris', label: 'QRIS', icon: QrCode, group: 'qris' },
  { id: 'gopay', label: 'GoPay', icon: Smartphone, group: 'ewallet' },
  { id: 'ovo', label: 'OVO', icon: Smartphone, group: 'ewallet' },
  { id: 'dana', label: 'DANA', icon: Smartphone, group: 'ewallet' },
  { id: 'shopeepay', label: 'ShopeePay', icon: Smartphone, group: 'ewallet' },
  { id: 'va_bca', label: 'VA BCA', icon: Building2, group: 'bank' },
  { id: 'va_mandiri', label: 'VA Mandiri', icon: Building2, group: 'bank' },
];

const payLabels: Record<string, string> = {
  qris: 'QRIS', gopay: 'GoPay', ovo: 'OVO', dana: 'DANA', shopeepay: 'ShopeePay', va_bca: 'VA BCA', va_mandiri: 'VA Mandiri',
};

const CheckSvg = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);

export function CartDrawer({ isOpen, onClose, customerName, onOrderComplete }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, subtotal, shipping, total, clearCart } = useCart();
  const [step, setStep] = useState<'cart' | 'checkout' | 'payment_waiting' | 'success'>('cart');
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [formData, setFormData] = useState({ fullName: '', phone: '', address: '' });

  const handleCheckout = () => {
    setFormData({ fullName: customerName || '', phone: '', address: '' });
    setStep('checkout');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) { alert('Pilih metode pembayaran.'); return; }
    setLoading(true);

    try {
      const orderNumber = `GLW-${Date.now()}`;
      const orderData = {
        order_number: orderNumber,
        customer_name: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        items: items.map((item: CartItem) => ({
          id: item.id, name: item.name, category: item.category, price: item.price, quantity: item.quantity, subtotal: item.price * item.quantity,
        })),
        total,
        status: 'pending',
        payment_method: selectedPayment,
      };

      const { error } = await supabase.from('orders').insert(orderData);
      if (error) throw error;

      // Panggil Supabase Edge Function untuk generate Snap token
      let paymentInstructions = '';
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const midtransKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
      const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';

      try {
        const snapResponse = await fetch(`${SUPABASE_URL}/functions/v1/swift-processor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            order_id: orderNumber,
            gross_amount: total,
            item_details: [
  ...items.map(i => ({ id: i.id, price: i.price, quantity: i.quantity, name: i.name.substring(0, 50) })),
  { id: 'shipping', price: shipping, quantity: 1, name: 'Ongkos Kirim' },
],
            customer_details: { first_name: formData.fullName, phone: formData.phone },
            enabled_payments: [selectedPayment],
          }),
        });

        const snapData = await snapResponse.json();

        if (!snapResponse.ok || !snapData.token) {
          throw new Error('Gagal membuat transaksi');
        }

        const snapToken = snapData.token;
        await supabase.from('orders').update({ snap_token: snapToken }).eq('order_number', orderNumber);

        const snapUrl = isProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
        const existingScript = document.querySelector(`script[src="${snapUrl}"]`);
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = snapUrl;
          script.setAttribute('data-client-key', midtransKey);
          script.async = true;
          document.head.appendChild(script);
          await new Promise<void>((resolve) => { script.onload = () => resolve(); });
        }

        setStep('payment_waiting');

        (window as any).snap.pay(snapToken, {
          onSuccess: async () => {
            await supabase.from('orders').update({ status: 'paid' }).eq('order_number', orderNumber);
            onOrderComplete(`Pembayaran berhasil diterima!\nNo. Order: #${orderNumber}\nTotal: Rp${total.toLocaleString('id-ID')}\nTerima kasih telah berbelanja!`);
            clearCart();
            setStep('success');
          },
          onPending: () => {
            onOrderComplete(`Pesanan kamu telah dibuat, namun PEMBAYARAN BELUM SELESAI.\nNo. Order: #${orderNumber}\nTotal: Rp${total.toLocaleString('id-ID')}\nSilakan selesaikan pembayaran melalui ${payLabels[selectedPayment]} untuk konfirmasi.`);
            clearCart();
            setStep('success');
          },
          onError: () => {
            setStep('checkout');
            alert('Pembayaran gagal. Silakan coba lagi.');
          },
          onClose: () => {
            setStep('checkout');
          },
        });
      } catch (err) {
        console.error('Midtrans error:', err);
        paymentInstructions = generatePaymentInstructions(selectedPayment, orderNumber);
        onOrderComplete(buildSuccessMessage(orderNumber, selectedPayment, formData.phone, paymentInstructions));
        clearCart();
        setStep('success');
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    }
    setLoading(false);
  };

  const buildSuccessMessage = (orderNumber: string, method: string, phone: string, instructions: string) =>
    `Pesanan kamu berhasil dibuat!\n\nNo. Order: #${orderNumber}\nMetode Pembayaran: ${payLabels[method] || method}\nTotal: Rp${total.toLocaleString('id-ID')}\n\nDetail Pesanan:\n${items.map((i: CartItem) => `- ${i.name} x${i.quantity} = Rp${(i.price * i.quantity).toLocaleString('id-ID')}`).join('\n')}\nOngkos Kirim: Rp${shipping.toLocaleString('id-ID')}\n\nInstruksi Pembayaran:\n${instructions}\n\nKami akan menghubungi kamu di ${phone}. Terima kasih!`;

  const generatePaymentInstructions = (method: string, orderNum: string) => {
    if (method === 'qris') return 'Scan QR Code yang akan dikirim ke WhatsApp kamu untuk pembayaran.';
    if (method.startsWith('va_')) { const bank = method === 'va_bca' ? 'BCA' : 'Mandiri'; return `Transfer ke Virtual Account ${bank}: 8800${orderNum.slice(-8)}`; }
    return `Pembayaran via ${payLabels[method]} akan diproses. Cek aplikasi ${payLabels[method]} kamu untuk konfirmasi.`;
  };

  const handleClose = () => { setStep('cart'); setSelectedPayment(''); onClose(); };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-pink-100">
          <div className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-pink-500" /><h2 className="font-semibold text-gray-800 text-sm">{step === 'cart' ? 'Keranjang Belanja' : step === 'checkout' ? 'Checkout' : step === 'payment_waiting' ? 'Menunggu Pembayaran' : 'Pesanan Berhasil'}</h2></div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-pink-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* CART */}
        {step === 'cart' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? <div className="text-center py-12"><ShoppingBag className="w-16 h-16 text-pink-200 mx-auto mb-4" /><p className="text-gray-500 text-sm">Keranjang masih kosong</p></div> :
                <div className="space-y-3">{items.map(item => (<div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"><div className="flex-1 min-w-0"><p className="font-medium text-gray-800 text-sm truncate">{item.name}</p><p className="text-xs text-gray-500">{item.category}</p><p className="text-sm font-semibold text-pink-500 mt-1">Rp{item.price.toLocaleString('id-ID')}</p></div><div className="flex items-center gap-1.5"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-white border border-pink-200 flex items-center justify-center hover:bg-pink-50"><Minus className="w-3.5 h-3.5 text-gray-600" /></button><span className="w-7 text-center text-sm font-medium">{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-white border border-pink-200 flex items-center justify-center hover:bg-pink-50"><Plus className="w-3.5 h-3.5 text-gray-600" /></button><button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 ml-1"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div></div>))}</div>}
            </div>
            {items.length > 0 && (<div className="flex-shrink-0 border-t border-pink-100 p-4 space-y-2 bg-white"><div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>Rp{subtotal.toLocaleString('id-ID')}</span></div><div className="flex justify-between text-sm text-gray-600"><span>Ongkir</span><span>Rp{shipping.toLocaleString('id-ID')}</span></div><div className="flex justify-between font-semibold text-gray-800 pt-2 border-t border-pink-100"><span>Total</span><span className="text-pink-500">Rp{total.toLocaleString('id-ID')}</span></div><button onClick={handleCheckout} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white text-sm font-medium shadow-md hover:shadow-lg">Checkout Sekarang</button></div>)}
          </div>
        )}

        {/* CHECKOUT */}
        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap</label><input type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 text-sm" required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nomor HP</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="08xxxxxxxxxx" className="w-full px-3 py-2.5 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 text-sm" required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Alamat Pengiriman</label><textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 resize-none text-sm" required /></div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Metode Pembayaran</label>
                {['qris', 'ewallet', 'bank'].map(group => (
                  <div key={group} className="mb-3">
                    <p className="text-xs text-gray-500 mb-1.5 font-medium">{{ qris: 'QRIS', ewallet: 'E-Wallet', bank: 'Virtual Account' }[group]}</p>
                    {paymentMethods.filter(p => p.group === group).map(pm => (
                      <button key={pm.id} type="button" onClick={() => setSelectedPayment(pm.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all mb-1.5 ${selectedPayment === pm.id ? 'border-pink-400 bg-pink-50' : 'border-gray-200 hover:border-pink-200'}`}>
                        <pm.icon className={`w-5 h-5 ${selectedPayment === pm.id ? 'text-pink-500' : 'text-gray-500'}`} />
                        <span className="text-sm font-medium text-gray-800">{pm.label}</span>
                        {selectedPayment === pm.id && <CheckSvg className="w-4 h-4 text-pink-500 ml-auto" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-pink-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-800 text-sm mb-2">Ringkasan</h3>
                {items.map(item => (<div key={item.id} className="flex justify-between text-xs py-1"><span className="text-gray-600">{item.name} x{item.quantity}</span><span className="text-gray-800">Rp{(item.price * item.quantity).toLocaleString('id-ID')}</span></div>))}
                <div className="border-t border-pink-200 mt-2 pt-2 text-xs"><div className="flex justify-between text-gray-600"><span>Subtotal</span><span>Rp{subtotal.toLocaleString('id-ID')}</span></div><div className="flex justify-between text-gray-600"><span>Ongkir</span><span>Rp{shipping.toLocaleString('id-ID')}</span></div><div className="flex justify-between font-semibold text-pink-500 mt-1 text-sm"><span>Total</span><span>Rp{total.toLocaleString('id-ID')}</span></div></div>
              </div>
            </div>

            <div className="p-4 border-t border-pink-100 space-y-2 flex-shrink-0">
              <button type="button" onClick={() => setStep('cart')} className="w-full py-2.5 rounded-xl border-2 border-pink-200 text-gray-700 text-sm font-medium hover:bg-pink-50">Kembali</button>
              <button type="submit" disabled={loading || !selectedPayment} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white text-sm font-medium shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">{loading ? <><Loader2 className="w-4 h-4 animate-spin" />Memproses...</> : !selectedPayment ? 'Pilih Metode Pembayaran' : 'Bayar Sekarang'}</button>
            </div>
          </form>
        )}

        {/* PAYMENT WAITING */}
        {step === 'payment_waiting' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Menunggu Pembayaran...</h3>
            <p className="text-gray-600 text-sm">Selesaikan pembayaran di jendela popup yang terbuka.</p>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pesanan Berhasil!</h3>
            <p className="text-gray-600 text-sm mb-6">Detail dikirim ke chat.</p>
            <button onClick={handleClose} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white text-sm font-medium">Tutup</button>
          </div>
        )}
      </div>
    </div>
  );
}
