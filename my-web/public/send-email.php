<?php
require_once 'PHPMailer/src/Exception.php';
require_once 'PHPMailer/src/PHPMailer.php';
require_once 'PHPMailer/src/SMTP.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$config = require_once 'config.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    try {
        $email = filter_var($_POST["email"] ?? "", FILTER_VALIDATE_EMAIL);
        $message = strip_tags($_POST["message"] ?? "");
        $country = strip_tags($_POST["country"] ?? "No Country Selected");

        if (!$email) throw new Exception("Invalid email");
        if (empty($message)) throw new Exception("Message is empty");

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $config['smtp']['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtp']['username'];
        $mail->Password = $config['smtp']['password'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = $config['smtp']['port'];

        $mail->setFrom($config['email']['from'], $config['email']['from_name']);
        $mail->addAddress($config['email']['to']);
        $mail->addReplyTo($email);

        $mail->Subject = "New Inquiry from $country";
        $mail->Body = "From: $email\nCountry: $country\n\nMessage:\n$message";

        if (!empty($_FILES['files']['tmp_name'][0])) {
            $allowed = ['image/jpeg', 'image/png', 'application/pdf'];
            
            foreach ($_FILES['files']['tmp_name'] as $key => $tmp_name) {
                if ($_FILES['files']['error'][$key] === UPLOAD_ERR_OK) {
                    $file_type = $_FILES['files']['type'][$key];
                    $file_name = $_FILES['files']['name'][$key];
                    
                    if (in_array($file_type, $allowed)) {
                        $mail->addAttachment($tmp_name, $file_name);
                    }
                }
            }
        }

        $mail->send();
        echo json_encode(["status" => "success", "message" => "Email sent successfully."]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to send email: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Invalid method."]);
}
?>