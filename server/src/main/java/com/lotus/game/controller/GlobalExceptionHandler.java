package com.lotus.game.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.time.Instant;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = Logger.getLogger(GlobalExceptionHandler.class.getName());

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorBody> handleBadRequest(IllegalArgumentException ex, HttpServletRequest req) {
        log.warning("Bad request [" + req.getRequestURI() + "]: " + ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorBody.builder()
                        .timestamp(Instant.now().toString())
                        .status(HttpStatus.BAD_REQUEST.value())
                        .error("Ошибка запроса")
                        .message(ex.getMessage())
                        .path(req.getRequestURI())
                        .build());
    }

    @ExceptionHandler({MissingServletRequestPartException.class, MultipartException.class})
    public ResponseEntity<ErrorBody> handleMultipart(Exception ex, HttpServletRequest req) {
        String msg = ex instanceof MissingServletRequestPartException m
                ? "Не прикреплён файл: " + m.getRequestPartName()
                : (ex.getMessage() != null ? ex.getMessage() : "Ошибка загрузки файла");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorBody.builder()
                .timestamp(Instant.now().toString())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Ошибка загрузки")
                .message(msg)
                .path(req.getRequestURI())
                .build());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorBody> handleMaxUpload(MaxUploadSizeExceededException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorBody.builder()
                .timestamp(Instant.now().toString())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Файл слишком большой")
                .message("Размер файла превышает лимит 10 МБ. Выберите файл меньшего размера.")
                .path(req.getRequestURI())
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleGeneric(Exception ex, HttpServletRequest req) {
        log.log(Level.SEVERE, "Unexpected error at " + req.getRequestURI(), ex);
        String msg = ex.getMessage() != null ? ex.getMessage() : "Внутренняя ошибка сервера";
        String detail = ex.getClass().getSimpleName() + (ex.getCause() != null ? ": " + ex.getCause().getMessage() : "");
        Map<String, String> details = new HashMap<>();
        details.put("exception", ex.getClass().getName());
        if (ex.getCause() != null) {
            details.put("cause", ex.getCause().getClass().getSimpleName() + " - " + ex.getCause().getMessage());
        }
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorBody.builder()
                        .timestamp(Instant.now().toString())
                        .status(500)
                        .error("Внутренняя ошибка сервера")
                        .message(msg + (detail.length() > 0 ? " (" + detail + ")" : ""))
                        .path(req.getRequestURI())
                        .details(details)
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(err -> {
            String field = err instanceof FieldError f ? f.getField() : err.getObjectName();
            errors.put(field, err.getDefaultMessage());
        });
        String message = errors.entrySet().stream()
                .map(e -> e.getKey() + ": " + e.getValue())
                .collect(Collectors.joining("; "));
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorBody.builder()
                        .timestamp(Instant.now().toString())
                        .status(HttpStatus.BAD_REQUEST.value())
                        .error("Ошибка валидации")
                        .message(message)
                        .path(req.getRequestURI())
                        .details(errors)
                        .build());
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ErrorBody {
        private String timestamp;
        private int status;
        private String error;
        private String message;
        private String path;
        private Map<String, String> details;
    }
}
