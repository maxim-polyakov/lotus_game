package com.lotus.game.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CORSConfiguration;
import software.amazon.awssdk.services.s3.model.CORSRule;
import software.amazon.awssdk.services.s3.model.PutBucketCorsRequest;

/**
 * Ensures the public card/avatar bucket allows browser texture loads (WebGL needs CORS).
 */
@Component
@ConditionalOnBean(S3Client.class)
@RequiredArgsConstructor
@Slf4j
public class S3CorsInitializer {

    private final S3Client s3Client;
    private final YandexStorageProperties props;

    @PostConstruct
    public void ensureBucketCors() {
        try {
            CORSRule rule = CORSRule.builder()
                    .allowedOrigins("*")
                    .allowedMethods("GET", "HEAD")
                    .allowedHeaders("*")
                    .exposeHeaders("ETag", "Content-Type", "Content-Length")
                    .maxAgeSeconds(86400)
                    .build();
            s3Client.putBucketCors(PutBucketCorsRequest.builder()
                    .bucket(props.getBucketName())
                    .corsConfiguration(CORSConfiguration.builder().corsRules(rule).build())
                    .build());
            log.info("Configured CORS on bucket {}", props.getBucketName());
        } catch (Exception e) {
            log.warn("Could not configure S3 CORS on bucket {}: {}", props.getBucketName(), e.getMessage());
        }
    }
}
