export async function checkBookAccess(slug: string, userId?: string) {
  // 1. Chequear localStorage (para sesiones no autenticadas)
  if (typeof window !== 'undefined') {
    // 🔑 CLAVES ESPECÍFICAS POR LIBRO
    if (localStorage.getItem(`purchased_${slug}`)) return true;
    if (localStorage.getItem(`subscription_${slug}`)) return true;  // 👈 CORREGIDO: usa el slug
  }
  
  // 2. Si hay usuario logueado, consultar API
  if (userId) {
    try {
      const res = await fetch(`/api/user/access?book=${slug}`, {
        headers: { Authorization: `Bearer ${userId}` }
      });
      return res.ok;
    } catch (e) {
      console.warn('⚠️ Error verificando acceso API:', e);
      return false;
    }
  }
  
  return false;
}