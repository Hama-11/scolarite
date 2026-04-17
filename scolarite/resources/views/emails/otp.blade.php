<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            letter-spacing: 8px;
            color: #6366f1;
            text-align: center;
            padding: 20px;
            background: #f3f4f6;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Code de vérification</h1>
        <p>Bonjour {{ $name }},</p>
        <p>Votre code de vérification pour连接到 University est:</p>
        
        <div class="otp-code">{{ $otp }}</div>
        
        <p>Ce code est valide pendant 10 minutes.</p>
        
        <p>Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.</p>
        
        <p>Cordialement,</p>
   <br>L'équipe University </div>
</body>
</html>
