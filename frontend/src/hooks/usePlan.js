import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

export default function usePlan() {

  const [plan, setPlan] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await api.get('/subscriptions/current');
      setPlan(res.data.data?.plan);
    } catch (err) {
      console.error(err);
    }
  };

  return plan;
}