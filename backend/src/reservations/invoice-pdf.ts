import type { Client, Reservation } from '../database/entities.js';

const clean = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?').replace(/[\\()]/g, '\\$&');
const money = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} MGA`;

export function createInvoicePdf(reservation: Reservation, client: Client, issuer: string) {
  const rows = [
    issuer,
    'FACTURE DE LOCATION',
    `Numero: FAC-${reservation.reference}`,
    `Date: ${new Date().toLocaleDateString('fr-FR')}`,
    `Client: ${client.prenom} ${client.nom}`,
    `Email: ${client.email ?? '-'}`,
    `Telephone: ${client.telephone}`,
    `Periode: ${reservation.dateDebut} au ${reservation.dateFin}`,
    `Remise: ${reservation.modeRemise}${reservation.adresseLivraison ? ` - ${reservation.adresseLivraison}` : ''}`,
    '------------------------------------------------------------',
    'DESIGNATION                 QTE    JOURS    PRIX/JOUR    TOTAL',
    ...reservation.lignes.map((line) => `${line.article?.nom ?? `Article ${line.articleId}`} | ${line.quantite} | ${line.nbJours} | ${money(line.prixJourUnitaire)} | ${money(line.totalLigne)}`),
    '------------------------------------------------------------',
    `TOTAL LOCATION: ${money(reservation.total)}`,
    `CAUTION: ${money(reservation.cautionTotale)}`,
    `TOTAL A REGLER (hors caution): ${money(reservation.total)}`,
    'Document genere depuis le systeme de gestion de location.',
  ].slice(0, 48);

  const commands = ['BT', '/F1 10 Tf', '48 790 Td', '14 TL'];
  rows.forEach((row, index) => {
    if (index > 0) commands.push('T*');
    commands.push(`(${clean(row)}) Tj`);
  });
  commands.push('ET');
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}
