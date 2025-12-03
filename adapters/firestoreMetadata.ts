// Firestore metadata adapter (optional).
// This file attempts to dynamically import Firebase SDK and read metadata documents
// from a configurable Firestore path. It's a best-effort helper: if Firebase is
// not installed or config is not provided the functions will reject.

export async function fetchMetadataFromFirestore(appId: string = 'default') {
  try {
    // dynamic import so package is optional
    const firebase = await import('firebase/app');
    await import('firebase/firestore');
    // @ts-ignore
    if (!firebase.apps?.length) {
      const cfg = (window as any).__FIREBASE_CONFIG__ || (process && (process as any).env && (process as any).env.VITE_FIREBASE_CONFIG);
      if (!cfg) throw new Error('Firebase config not found in window.__FIREBASE_CONFIG__ or VITE_FIREBASE_CONFIG');
      // when VITE_FIREBASE_CONFIG is a JSON string
      const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
      firebase.initializeApp(parsed);
    }
    // @ts-ignore
    const db = firebase.firestore();
    // Try multiple layout strategies for metadata storage. Firestore layouts vary, so we attempt best-effort reads.
    const base = db.collection('artifacts').doc(appId).collection('public');

    // Strategy A: single document 'data' containing JSON fields:
    try {
      const docRef = base.doc('data');
      const doc = await docRef.get();
      if (doc.exists) {
        return doc.data();
      }
    } catch (e) { /* ignore and try next */ }

    // Strategy B: individual documents under collection 'data' (i.e. artifacts/{appId}/public/data/{name})
    try {
      const dataCol = base.collection('data');
      const snap = await dataCol.get();
      if (!snap.empty) {
        const out: any = {};
        snap.forEach(d => {
          const id = d.id;
          out[id] = d.data().items || d.data().value || d.data();
        });
        return out;
      }
    } catch (e) { /* ignore */ }

    // Strategy C: expect each metadata type as its own collection under artifacts/{appId}/public/{type}
    try {
      const types = ['care_levels', 'ownership_types', 'indicators', 'roles', 'permissions', 'role_permissions'];
      const out: any = {};
      let found = false;
      for (const t of types) {
        try {
          const c = base.doc(t); // try doc first
          const d = await c.get();
          if (d.exists) { out[t] = d.data().items || d.data(); found = true; continue; }
        } catch (e) { }
        try {
          const ccol = base.collection(t);
          const s = await ccol.get();
          if (!s.empty) {
            out[t] = [];
            s.forEach(dd => out[t].push(dd.data()));
            found = true;
          }
        } catch (e) { }
      }
      if (found) return out;
    } catch (e) { /* ignore */ }

    throw new Error('Could not locate metadata in Firestore using supported layout strategies.');
  } catch (e) {
    return Promise.reject(e);
  }
}
