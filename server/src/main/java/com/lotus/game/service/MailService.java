package com.lotus.game.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    private static final String VERIFICATION_SUBJECT = "Код подтверждения регистрации — Lotus Game";

    public void sendVerificationCode(String toEmail, String code) {
        String text = String.format(
                "Здравствуйте!\n\nВаш код для подтверждения регистрации: %s\n\nКод действителен 15 минут.\n\n— Lotus Game",
                code
        );
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject(VERIFICATION_SUBJECT);
        message.setText(text);
        try {
            mailSender.send(message);
            log.info("Verification email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Не удалось отправить письмо. Проверьте настройки почты.");
        }
    }

    public static String generateSixDigitCode() {
        int code = (int) (Math.random() * 1_000_000);
        return String.format("%06d", code);
    }
}
