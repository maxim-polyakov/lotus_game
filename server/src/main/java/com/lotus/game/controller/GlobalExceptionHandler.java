package com.lotus.game.controller;

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
    public ResponseEntity<ErrorBody> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorBody.builder()
                        .timestamp(Instant.now().toString())
                        .status(HttpStatus.BAD_REQUEST.value())
                        .error("Bad Request")
                        .message(ex.getMessage())
                        .build());
    }

    @ExceptionHandler({MissingServletRequestPartException.class, MultipartException.class})
    public ResponseEntity<ErrorBody> handleMultipart(Exception ex) {
        String msg = ex instanceof MissingServletRequestPartException m
                ? "Не прикреплён файл: " + m.getRequestPartName()
                : (ex.getMessage() != null ? ex.getMessage() : "Ошибка загрузки файла");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorBody.builder()
                .timestamp(Instant.now().toString())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message(msg)
                .build());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorBody> handleMaxUpload(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorBody.builder()
                .timestamp(Instant.now().toString())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message("Файл слишком большой (макс. 10MB)")
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleGeneric(Exception ex) {
        log.log(Level.SEVERE, "Unexpected error", ex);
        String msg = ex.getMessage() != null ? ex.getMessage() : "Внутренняя ошибка сервера";
        return ResponseEntity
                .status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorBody.builder()
                        .timestamp(Instant.now().toString())
                        .status(500)
                        .error("Internal Server Error")
                        .message(msg)
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex) {
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
                        .error("Validation Failed")
                        .message(message)
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
        private Map<String, String> details;
    }
}
