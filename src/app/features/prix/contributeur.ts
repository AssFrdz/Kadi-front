const CLE = 'kadi.contributeur';

/**
 * L'identifiant anonyme de ce téléphone ou de ce navigateur, créé une fois puis réutilisé.
 * C'est lui qui permet au back de compter les témoins (un contributeur = une voix).
 * Sans stockage disponible (navigation privée), un identifiant est créé pour la session.
 */
let identifiantDeSession: string | null = null;

export function contributeurAnonyme(): string {
  try {
    const existant = localStorage.getItem(CLE);
    if (existant) {
      return existant;
    }
    const nouveau = crypto.randomUUID();
    localStorage.setItem(CLE, nouveau);
    return nouveau;
  } catch {
    identifiantDeSession ??= crypto.randomUUID();
    return identifiantDeSession;
  }
}
