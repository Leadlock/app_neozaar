'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import toast from 'react-hot-toast';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import { useForm, Controller } from 'react-hook-form';
import Image from 'next/image';

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    const payload = {
      basic_info: {
        ...data,
        consent: !!data.consent,
      },
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}enquiry/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // CTA action: update scoring, create opportunity, create account if new customer
      fetch(`${process.env.NEXT_PUBLIC_API_BASE}public/leads/cta-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.fullName,
          email: data.email,
          phone: data.mobile,
          company: data.companyName,
          requirement: data.notes || `Enquiry - Product: ${data.productid || 'N/A'}`,
          source: 'Enquiry Button',
          consent_status: !!data.consent,
        }),
      }).catch(() => {});

      const result = await res.json();
      if (res.ok && result.status === 'success') {
        toast.success('Enquiry Submitted!');
        router.push('/thank-you');
      } else {
        toast.error(result.message || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1920px] m-auto bg-black">
      <Header />
      <div className="p-6 grid grid-cols-7 gap-6 text-white">
        <div className="col-span-5">
          <a href="#" className="inline-block px-6 py-2 bg-red-500 text-white font-medium">Back</a>
        </div>

        <div className="px-6 py-6 w-full col-span-7 lg:col-span-4 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
          <h2 className="text-xl font-medium mb-4">Enquiry Form</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <input
                {...register("companyName", { required: "Company Name is required" })}
                placeholder="Company Name"
                className={`w-full px-3 py-3 bg-transparent ${errors.companyName ? 'border-red-500' : 'border-zinc-700'} border`}
              />
              {errors.companyName && <p className="text-red-400 text-sm">{errors.companyName.message}</p>}
            </div>

            <div className="col-span-2 md:col-span-1">
              <input
                {...register("fullName", { required: "Full Name is required" })}
                placeholder="Full Name"
                className={`w-full px-3 py-3 bg-transparent ${errors.fullName ? 'border-red-500' : 'border-zinc-700'} border`}
              />
              {errors.fullName && <p className="text-red-400 text-sm">{errors.fullName.message}</p>}
            </div>

            <div className="col-span-2 md:col-span-1">
      
                            <input
                {...register("mobile", { required: "Phone numder is required" })}
                placeholder="Please Enter your phone number"
                className={`w-full px-3 py-3 bg-transparent ${errors.mobile ? 'border-red-500' : 'border-zinc-700'} border`}
              />
              {errors.fullName && <p className="text-red-400 text-sm">{errors.mobile.message}</p>}
            </div>

            <div className="col-span-2 md:col-span-1">
              <input
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email format",
                  },
                })}
                placeholder="Business Email"
                className={`w-full px-3 py-3 bg-transparent ${errors.email ? 'border-red-500' : 'border-zinc-700'} border`}
              />
              {errors.email && <p className="text-red-400 text-sm">{errors.email.message}</p>}
            </div>

            <div className="col-span-2 md:col-span-1">
              <input
                {...register("productid", { required: "Product Name is required" })}
                placeholder="Product Name"
                className={`w-full px-3 py-3 bg-transparent ${errors.productid ? 'border-red-500' : 'border-zinc-700'} border`}
              />
              {errors.productid && <p className="text-red-400 text-sm">{errors.productid.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="block mb-1">Preferred Contact</label>
              <div className="flex space-x-4">
                {["call", "email", "whatsapp"].map((method) => (
                  <label key={method} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value={method}
                      {...register("preferredContact", { required: "Preferred contact is required" })}
                    />
                    <span>{method}</span>
                  </label>
                ))}
              </div>
              {errors.preferredContact && <p className="text-red-400 text-sm">{errors.preferredContact.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-white mb-1">Requirements </label>
              <textarea
                {...register("notes")}
                rows="5"
                className={`w-full p-2 text-sm col-span-2 text-white bg-zinc-800 ${errors.notes ? 'border-red-500' : 'border-zinc-700'} border`}
                placeholder="Tell us more..."
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register("consent", { required: "You must agree to receive communications" })}
                />
                <span>I agree to receive communications</span>
              </label>
              {errors.consent && <p className="text-red-400 text-sm">{errors.consent.message}</p>}
            </div>

            <div className="col-span-2 text-right mt-6">
              <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-purple-700">
                {loading ? "Submitting..." : "Submit Enquiry"}
              </button>
            </div>
          </form>
        </div>

        <div className="col-span-7 lg:col-span-3">
          <div className="px-7 py-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg mb-6">
            <div className="flex gap-6">
              <Image src="/image/acronis.png" alt="Logo" width={120} height={120} />
              <div>
                <h2 className="text-xl font-semibold mb-3">Product Name</h2>
                <p className="text-sm line-clamp-4">Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
              </div>
            </div>
          </div>

          <div className="px-7 py-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
            <h5 className="text-lg font-semibold mb-3">Company Information</h5>
            <p className="text-sm mb-4">Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
            <div className="space-y-1 text-sm">
              <p><strong>Contact Number:</strong> +1 (234) 567-8901</p>
              <p><strong>Email:</strong> contact@company.com</p>
              <p><strong>Address:</strong> 123 Street, NY 10001</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
