<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $nome = htmlspecialchars($_POST["nome"]);
    $email = filter_var($_POST["email"], FILTER_VALIDATE_EMAIL);
    $mensagem = htmlspecialchars($_POST["mensagem"]);

    if (!$email) {
        http_response_code(400);
        echo "Email inválido.";
        exit;
    }

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = $_ENV['EMAIL_USERNAME'];
        $mail->Password = $_ENV['EMAIL_PASSWORD'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->setFrom($mail->Username, 'Oasys Landing Page');
        $mail->addAddress($_ENV['EMAIL_ADDRESS']);

        $mail->isHTML(true);
        $mail->Subject = "Nova mensagem de $nome";
        $mail->Body = nl2br("Nome: $nome\nEmail: $email\n\nMensagem:\n$mensagem");

        $mail->send();
        echo "Mensagem enviada com sucesso.";
    } catch (Exception $e) {
        http_response_code(500);
        echo "Erro ao enviar: " . $mail->ErrorInfo;
    }
}
