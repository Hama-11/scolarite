<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #6366f1; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Vérification de votre adresse email</h1>
        <p>Bonjour {{ $name }},</p>
        <p>Merci de vous être inscrit sur la plateforme University Tutoring. Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous:</p>
        
        <a href="{{ $url }}" class="button">Vérifier mon email</a>
        
        <p>Ou copiez ce lien dans votre navigateur:</p>
        <p>{{ $url }}</p>
        
        <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
        
        <p>Cordialement,<br>L'équipe University</p>
    </div>
</body>
</html>
