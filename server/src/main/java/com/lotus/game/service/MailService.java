package com.lotus.game.service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.mail.from.name:Lotus}")
    private String fromName;

    private static final String VERIFICATION_SUBJECT = "Код подтверждения регистрации — Lotus Game";
    private static final String PASSWORD_RESET_SUBJECT = "Код для сброса пароля — Lotus Game";

    public void sendVerificationCode(String toEmail, String code) {
        String text = String.format(
                "Здравствуйте!\n\nВаш код для подтверждения регистрации: %s\n\nКод действителен 15 минут.\n\n— Lotus Game",
                code
        );
        try {
            MimeMessage message = mailSender.createMimeMessage();
            message.setFrom(new InternetAddress(fromEmail, fromName));
            message.setRecipients(MimeMessage.RecipientType.TO, toEmail);
            message.setSubject(VERIFICATION_SUBJECT);
            message.setText(text, "UTF-8");
            mailSender.send(message);
            log.info("Verification email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Не удалось отправить письмо. Проверьте настройки почты.");
        }
    }

    public void sendPasswordResetCode(String toEmail, String code) {
        String text = String.format(
                "Здравствуйте!\n\nВаш код для сброса пароля: %s\n\nКод действителен 15 минут.\n\nЕсли вы не запрашивали сброс пароля, проигнорируйте это письмо.\n\n— Lotus Game",
                code
        );
        try {
            MimeMessage message = mailSender.createMimeMessage();
            message.setFrom(new InternetAddress(fromEmail, fromName));
            message.setRecipients(MimeMessage.RecipientType.TO, toEmail);
            message.setSubject(PASSWORD_RESET_SUBJECT);
            message.setText(text, "UTF-8");
            mailSender.send(message);
            log.info("Password reset email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Не удалось отправить письмо. Проверьте настройки почты.");
        }
    }

    public static String generateSixDigitCode() {
        int code = (int) (Math.random() * 1_000_000);
        return String.format("%06d", code);
    }
}
