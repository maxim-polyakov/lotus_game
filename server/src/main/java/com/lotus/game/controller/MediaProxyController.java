package com.lotus.game.controller;

import com.lotus.game.config.YandexStorageProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Proxies public Yandex Object Storage media so Phaser/WebGL can load textures
 * without requiring CORS headers on the bucket.
 */
@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaProxyController {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final YandexStorageProperties storageProperties;

    @GetMapping("/proxy")
    public ResponseEntity<byte[]> proxy(@RequestParam("url") String url) throws IOException, InterruptedException {
        if (!isAllowed(url)) {
            return ResponseEntity.badRequest().build();
        }

        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(20))
                .GET()
                .build();
        HttpResponse<InputStream> response = HTTP.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            return ResponseEntity.status(response.statusCode()).build();
        }

        byte[] body = response.body().readAllBytes();
        String contentType = response.headers()
                .firstValue("Content-Type")
                .orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .contentType(MediaType.parseMediaType(contentType))
                .body(body);
    }

    private boolean isAllowed(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String endpoint = storageProperties.getEndpoint() != null
                ? storageProperties.getEndpoint()
                : "https://storage.yandexcloud.net";
        String bucket = storageProperties.getBucketName() != null
                ? storageProperties.getBucketName()
                : "lotus";
        String prefix = endpoint.replaceAll("/$", "") + "/" + bucket + "/";
        return url.startsWith(prefix) || url.startsWith("https://storage.yandexcloud.net/" + bucket + "/");
    }
}
