/**
 * Lit le contenu texte d'un `File` et le transmet à `onText`, en centralisant le
 * motif `file.text().then(...)` avec la gestion d'erreur (lecture refusée, fichier
 * illisible). Aucune validation de taille ici : c'est à l'appelant de borner le
 * coût de son traitement.
 */
export function readTextFile(
  file: File,
  onText: (text: string) => void,
  onError?: (error: unknown) => void,
): void {
  file.text().then(onText, (error: unknown) => onError?.(error));
}
