<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Recu de paiement</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #1f2937; font-size: 12px; }
        .header { border-bottom: 2px solid #0f172a; margin-bottom: 16px; padding-bottom: 8px; }
        .title { font-size: 22px; font-weight: bold; margin: 0; }
        .subtitle { color: #4b5563; margin-top: 4px; }
        .grid { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .grid td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        .label { width: 180px; color: #6b7280; }
        .strong { font-weight: bold; }
        .section-title { margin-top: 18px; font-size: 14px; font-weight: bold; }
        .meta { margin-top: 18px; color: #6b7280; font-size: 11px; }
        .qr { margin-top: 12px; }
        .signature { word-break: break-all; font-size: 10px; color: #374151; }
    </style>
</head>
<body>
    <div class="header">
        <p class="title">Recu de paiement</p>
        <p class="subtitle">Plateforme scolarite - document de verification</p>
    </div>

    <table class="grid">
        <tr><td class="label">Recu #</td><td class="strong">{{ $payment->id }}</td></tr>
        <tr><td class="label">Date paiement</td><td>{{ $payment->payment_date }}</td></tr>
        <tr><td class="label">Montant</td><td class="strong">{{ number_format((float) $payment->amount, 2, ',', ' ') }} EUR</td></tr>
        <tr><td class="label">Methode</td><td>{{ $payment->method }}</td></tr>
        <tr><td class="label">Reference transaction</td><td>{{ $payment->reference ?: '-' }}</td></tr>
        <tr><td class="label">Statut</td><td>{{ $payment->status }}</td></tr>
        <tr><td class="label">Etudiant</td><td>{{ optional(optional($payment->tuition)->student)->user->name ?? '-' }}</td></tr>
        <tr><td class="label">Frais</td><td>{{ optional($payment->tuition)->description ?: ('Tuition #' . optional($payment->tuition)->id) }}</td></tr>
        <tr><td class="label">Annee academique</td><td>{{ optional(optional($payment->tuition)->academicYear)->name ?? '-' }}</td></tr>
    </table>

    <p class="section-title">Verification</p>
    <p>Scannez le QR code ou utilisez le lien de verification pour verifier l integrite du recu.</p>
    <p><a href="{{ $verificationUrl }}">{{ $verificationUrl }}</a></p>

    <div class="qr">
        <img src="{{ $qrCodeUrl }}" alt="QR code verification" width="140" height="140" />
    </div>

    <p class="section-title">Signature numerique</p>
    <p class="signature">{{ $receiptSignature }}</p>

    <p class="meta">
        Genere le {{ $generatedAt }} -
        Ce document est produit automatiquement.
    </p>
</body>
</html>

