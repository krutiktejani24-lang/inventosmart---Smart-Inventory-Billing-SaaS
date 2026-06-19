  import Navbar from "../components/Navbar";
  import Sidebar from "../components/Sidebar";
  import { useEffect, useState } from "react";
import api from "../api/axiosConfig";

  export default function Payments() {

const [payments, setPayments] = useState([]);
const [invoices, setInvoices] = useState([]);
const [search, setSearch] = useState("");
const [methodFilter, setMethodFilter] = useState("All");
const [summary, setSummary] = useState({
  cashCollection: 0,
  onlineCollection: 0,
  totalCollection: 0,
});

const [form, setForm] = useState({
  invoiceId: "",
  amount: "",
  method: "Cash",
  reference: "",
});

useEffect(() => {

  loadPayments();

  loadSummary();

  loadInvoices();

}, []);

const handleChange = (e) => {
  setForm({
    ...form,
    [e.target.name]: e.target.value,
  });
};

const loadPayments = async () => {
  try {
    const res = await api.get("/payments");
    setPayments(res.data.data);
  } catch (err) {
    console.error(err);
  }
};

const loadSummary = async () => {
  try {
    const res = await api.get("/payments/summary");
    setSummary(res.data.data);
  } catch (err) {
    console.error(err);
  }
};

const loadInvoices = async () => {
  try {
    const res = await api.get("/invoices");
    setInvoices(
      res.data.invoices || []
    );
  } catch (err) {
    console.error(err);
  }
};

const savePayment = async () => {
  try {

    await api.post("/payments", form);

    alert("Payment Saved Successfully");

    setForm({
      invoiceId: "",
      amount: "",
      method: "Cash",
      reference: "",
    });

    loadPayments();
    loadSummary();

  } catch (err) {

    console.error(err);

    alert(
      err.response?.data?.message ||
      "Failed to save payment"
    );
  }
};

const filteredPayments = payments.filter((payment) => {

  const matchesSearch =
    payment.invoice?.invoice_no
      ?.toLowerCase()
      .includes(search.toLowerCase()) ||

    payment.invoice?.customer?.name
      ?.toLowerCase()
      .includes(search.toLowerCase());

  const matchesMethod =
    methodFilter === "All" ||
    payment.method === methodFilter;

  return matchesSearch && matchesMethod;
});

const deletePayment = async (id) => {

  if (!window.confirm("Delete this payment?"))
    return;

  try {

    await api.delete(`/payments/${id}`);

    loadPayments();
    loadSummary();

  } catch (err) {

    console.error(err);

    alert("Failed to delete payment");

  }
};
    return (
      <div className="flex min-h-screen bg-slate-50">

        <Sidebar />

        <div className="flex-1">

          <Navbar title="Payments" />

          <div className="p-6">
              <h1 className="text-2xl font-bold">
              Payment Management  
            </h1>

            <p className="text-slate-500 mt-1">
              Manage customer payments
            </p>

            <div className="bg-white rounded-xl shadow-sm border p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">
                Add Payment
              </h2>

            <div className="grid md:grid-cols-2 gap-4">
             <select
  name="invoiceId"
  value={form.invoiceId}
  onChange={handleChange}
  className="border rounded-lg p-3"
>
  <option value="">
    Select Invoice
  </option>

  {invoices.map((invoice) => (
    <option
      key={invoice.id}
      value={invoice.id}
    >
      {invoice.invoice_no}
    </option>
  ))}
</select>

<input
  value={
    invoices.find(
      i => i.id === form.invoiceId
    )?.customer?.name || ""
  }
  placeholder="Customer Name"
  className="border rounded-lg p-3"
  disabled
/>

<select
  name="method"
  value={form.method}
  onChange={handleChange}
  className="border rounded-lg p-3"
>
  <option>Cash</option>
  <option>UPI</option>
  <option>Bank Transfer</option>
  <option>Card</option>
  <option>Cheque</option>
</select>

<input
  name="amount"
  value={form.amount}
  onChange={handleChange}
  type="number"
  placeholder="Amount"
  className="border rounded-lg p-3"
/>

<input
  name="reference"
  value={form.reference}
  onChange={handleChange}
  placeholder="Reference Number"
  className="border rounded-lg p-3"
/>
              </div>

          <button
  onClick={savePayment}
  className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition"
>
  Save Payment
</button>

          </div>

          {/* Payment Summary */}

  <div className="grid md:grid-cols-3 gap-4 mt-6">

    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg">
    <p className="text-sm opacity-80">
      Cash Collection
    </p>

    <h2 className="text-4xl font-bold mt-2">
      ₹{summary.cashCollection}
    </h2>
  </div>

    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl p-6 shadow-lg">
    <p className="text-sm opacity-80">
      Online Collection
    </p>

    <h2 className="text-4xl font-bold mt-2">
      ₹{summary.onlineCollection}
    </h2>
  </div>

    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
    <p className="text-sm opacity-80">
      Total Collection
    </p>

    <h2 className="text-4xl font-bold mt-2">
      ₹{summary.totalCollection}
    </h2>
  </div>

  </div>
          
  <div className="bg-white rounded-xl shadow-sm border p-6 mt-6">

    <h2 className="text-lg font-semibold mb-4">
      Payment History
    </h2>

    <div className="flex justify-between items-center mb-4">

    <input
  type="text"
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Search payment..."
  className="border rounded-xl px-4 py-2 w-72"
/>

    <select
  value={methodFilter}
  onChange={(e) => setMethodFilter(e.target.value)}
  className="border rounded-xl px-4 py-2"
>
  <option value="All">All Methods</option>
  <option value="Cash">Cash</option>
  <option value="UPI">UPI</option>
  <option value="Card">Card</option>
  <option value="Bank Transfer">Bank Transfer</option>
  <option value="Cheque">Cheque</option>
</select>

  </div>

    <div className="overflow-x-auto">

      <table className="w-full">

        <thead>

          <tr className="border-b">

            <th className="text-left p-3">
               Action
            </th>

            <th className="text-left p-3">
              Invoice
            </th>

            <th className="text-left p-3">
              Customer
            </th>

            <th className="text-left p-3">
              Method
            </th>

            <th className="text-left p-3">
              Amount
            </th>

            <th className="text-left p-3">
              Date
            </th>
            <th className="text-left p-3">
              Status
            </th>
            <td className="p-3">
  <button
    onClick={() => deletePayment(payment.id)}
    className="text-red-600 font-medium"
  >
    Delete
  </button>
</td>

          </tr>

        </thead>

        <tbody>

  {payments.length === 0 ? (

    <tr>
      <td
        colSpan="6"
        className="text-center py-8 text-slate-500"
      >
        No Payments Found
      </td>
    </tr>

  ) : (

    filteredPayments.map((payment) => (

      <tr
        key={payment.id}
        className="border-b"
      >

        <td className="p-3">
          {payment.invoice?.invoice_no}
        </td>

        <td className="p-3">
          {payment.invoice?.customer?.name}
        </td>

        <td className="p-3">
          {payment.method}
        </td>

        <td className="p-3">
          ₹{payment.amount}
        </td>

        <td className="p-3">
          {new Date(
            payment.created_at
          ).toLocaleDateString()}
        </td>

        <td className="p-3">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
            Paid
          </span>
             </td>

         </tr>

       ))

      )}

     </tbody>

      </table>

    </div>

  </div>

 </div>
 </div> 
 </div> 
); 
}