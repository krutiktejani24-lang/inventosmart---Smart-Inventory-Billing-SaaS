import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Crown, Calendar, Package, Users, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Subscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);

useEffect(() => {
  loadSubscription();
}, []);

const loadSubscription = async () => {
  try {
    const res = await api.get('/subscriptions/current');
    setSubscription(res.data.data);

    console.log("Subscription:", res.data.data);

    const usageRes = await api.get('/subscriptions/usage');

    setUsage(usageRes.data.data);

    console.log("Usage:", usageRes.data.data);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  if (loading)
    return <div className="p-6">Loading...</div>;

  if (!subscription)
    return (
      <div className="p-6">
        <p>No active subscription found.</p>
      </div>
    );

  const plan = subscription.plan;

  return (
  <div className="flex h-screen bg-slate-50 overflow-hidden">

    {/* Sidebar */}
    <div className="hidden lg:flex">
      <Sidebar />
    </div>

    {/* Main Content */}
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">

      <Navbar title="Subscription" />

      <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5">

        <div className="max-w-6xl mx-auto">

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Crown className="text-amber-500" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Current Subscription
                </h1>
                <p className="text-sm text-slate-500">
                  Manage your active plan and usage limits
                </p>
              </div>
            </div>

             <div className="flex justify-between items-center mb-6">

          <div>

    <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
      <Crown size={12} />
      ACTIVE PLAN
    </div>

    <div className="mt-4 space-y-3">

      <div className="flex items-center gap-2 text-slate-600">
        <Calendar size={18} />
        <span>
        Active Since :{' '}
        {new Date(subscription.start_date).toLocaleDateString()}
        </span>
      </div>

      {subscription.end_date && (
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar size={18} />
          <span>
            Expires :{' '}
            {new Date(subscription.end_date).toLocaleDateString()}
          </span>
        </div>
      )}

    </div>

  </div>

  <div className="text-right">

    <h2 className="text-3xl font-bold text-slate-900">
      {plan.name}
    </h2>

    <p className="text-5xl font-extrabold text-indigo-600 mt-2">
      ₹{plan.price}
    </p>

    <p className="text-slate-500 uppercase tracking-wide">
      {plan.billing_cycle}
            </p>

           </div>

           </div>
            <div className="border-t my-8" />
            {subscription.end_date && (
              <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-slate-500">
                     Subscription Valid Till
                  </p>

             <h3 className="text-lg font-bold text-indigo-600">
               {new Date(subscription.end_date).toLocaleDateString()}
             </h3>
           </div>
          )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-indigo-50 rounded-xl p-5 text-center">
                <Package className="mx-auto mb-2 text-indigo-600" />
                <h3 className="text-2xl font-bold text-indigo-700">
                  {plan.max_products}
                </h3>
                <p className="text-sm text-slate-500">
                  Products
                </p>
              </div>

              <div className="bg-emerald-50 rounded-xl p-5 text-center">
                <Users className="mx-auto mb-2 text-emerald-600" />
                <h3 className="text-2xl font-bold text-emerald-700">
                  {plan.max_users}
                </h3>
                <p className="text-sm text-slate-500">
                  Users
                </p>
              </div>

              <div className="bg-amber-50 rounded-xl p-5 text-center">
                <FileText className="mx-auto mb-2 text-amber-600" />
                <h3 className="text-2xl font-bold text-amber-700">
                  {plan.max_invoices}
                </h3>
                <p className="text-sm text-slate-500">
                  Invoices
                </p>
              </div>

            </div>
             
             {usage && (
  <div className="mt-8">

    {usage.productsUsed >= usage.productsLimit * 0.8 && (
  <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl mb-4">
    ⚠️ You have used more than 80% of your product limit.
  </div>
)}

<div className="bg-slate-50 border rounded-xl p-4 mb-6">
  <p className="text-sm text-slate-500">
    Subscription Status
  </p>

<div className="grid grid-cols-3 gap-4 mt-4">

  <div className="bg-white rounded-lg p-3 text-center border">
    <h3 className="text-xl font-bold text-indigo-600">
      {usage.productsUsed}
    </h3>
    <p className="text-xs text-slate-500">
      Products Used
    </p>
  </div>

  <div className="bg-white rounded-lg p-3 text-center border">
    <h3 className="text-xl font-bold text-emerald-600">
      {usage.usersUsed}
    </h3>
    <p className="text-xs text-slate-500">
      Users Used
    </p>
  </div>

  <div className="bg-white rounded-lg p-3 text-center border">
    <h3 className="text-xl font-bold text-amber-600">
      {usage.invoicesUsed}
    </h3>
    <p className="text-xs text-slate-500">
      Invoices Used
    </p>
  </div>

</div>

  <div className="flex items-center gap-2 mt-2">
    <div className="w-2 h-2 rounded-full bg-green-500"></div>

    <span className="font-semibold text-green-600">
      Active
    </span>
  </div>
</div>
{usage.usersUsed >= usage.usersLimit && (
  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4">
    ⚠️ User limit reached. Upgrade your plan to add more users.
  </div>
)}
<h3 className="text-lg font-semibold mb-4">
  Usage Overview
</h3>

    <div className="space-y-4">

      {/* Products */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Products</span>
         <div className="flex items-center gap-3">
  <span>
    {usage.productsUsed} / {usage.productsLimit}
  </span>

  <span className="text-xs text-slate-500">
    {Math.round((usage.productsUsed / usage.productsLimit) * 100)}%
  </span>
</div>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full"
            style={{
              width: `${(usage.productsUsed / usage.productsLimit) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Users */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Users</span>
          <div className="flex items-center gap-3">
  <span>
    {usage.usersUsed} / {usage.usersLimit}
  </span>

  <span className="text-xs text-slate-500">
    {Math.round((usage.usersUsed / usage.usersLimit) * 100)}%
  </span>
</div>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className="bg-emerald-600 h-3 rounded-full"
            style={{
              width: `${(usage.usersUsed / usage.usersLimit) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Invoices */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Invoices</span>
          <div className="flex items-center gap-3">
  <span>
    {usage.invoicesUsed} / {usage.invoicesLimit}
  </span>

  <span className="text-xs text-slate-500">
    {Math.round((usage.invoicesUsed / usage.invoicesLimit) * 100)}%
  </span>
</div>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className="bg-amber-500 h-3 rounded-full"
            style={{
              width: `${(usage.invoicesUsed / usage.invoicesLimit) * 100}%`
            }}
          />
        </div>
      </div>

    </div>

  </div>
)}

{usage && (
  <div className="grid md:grid-cols-3 gap-4 mt-6">

    <div className="bg-indigo-50 rounded-xl p-4 text-center">
      <h3 className="text-2xl font-bold text-indigo-700">
        {usage.productsLimit - usage.productsUsed}
      </h3>
      <p className="text-sm text-slate-500">
        Products Remaining
      </p>
    </div>

    <div className="bg-emerald-50 rounded-xl p-4 text-center">
      <h3 className="text-2xl font-bold text-emerald-700">
        {usage.usersLimit - usage.usersUsed}
      </h3>
      <p className="text-sm text-slate-500">
        Users Remaining
      </p>
    </div>

    <div className="bg-amber-50 rounded-xl p-4 text-center">
      <h3 className="text-2xl font-bold text-amber-700">
        {usage.invoicesLimit - usage.invoicesUsed}
      </h3>
      <p className="text-sm text-slate-500">
        Invoices Remaining
      </p>
    </div>

  </div>
)}

            <div className="mt-8 flex justify-end">

              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition"> 
                Upgrade to Pro →
              </Link>

            </div>

          </div>

        </div>

      </main>

    </div>

  </div>
); 
}