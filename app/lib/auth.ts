export async function checkBookAccess(slug: string, userId?: string) {
  // 1. Chequear localStorage (para sesiones no autenticadas)
  if (typeof window !== 'undefined') {
    if (localStorage.getItem(`purchased_${slug}`)) return true;
    if (localStorage.getItem('subscription_active')) return true;
  }
  
  // 2. Si hay usuario logueado, consultar API
  if (userId) {
    const res = await fetch(`/api/user/access?book=${slug}`, {
      headers: { Authorization: `Bearer ${userId}` }
    });
    return res.ok;
  }
  
  return false;
}