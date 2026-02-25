package com.lotus.game.service;

import com.lotus.game.config.YandexStorageProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.InputStream;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnBean(S3Client.class)
public class StorageService {

    private static final String CARDS_PREFIX = "cards/";

    private final S3Client s3Client;
    private final YandexStorageProperties props;

    /**
     * Загружает изображение карты и возвращает публичный URL.
     * @param inputStream содержимое файла
     * @param contentType MIME-тип (image/png, image/jpeg и т.д.)
     * @param originalFilename исходное имя файла (для расширения)
     */
    public String uploadCardImage(InputStream inputStream, String contentType, String originalFilename) {
        String ext = getExtension(originalFilename);
        String key = CARDS_PREFIX + UUID.randomUUID() + ext;

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(props.getBucketName())
                .key(key)
                .contentType(contentType)
                .build();

        s3Client.putObject(request, RequestBody.fromInputStream(inputStream, -1));
        String url = buildPublicUrl(key);
        log.info("Uploaded card image: {}", url);
        return url;
    }

    public void deleteByUrl(String url) {
        if (url == null || !url.contains(props.getBucketName())) return;
        String key = extractKeyFromUrl(url);
        if (key != null) {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(props.getBucketName())
                    .key(key)
                    .build());
            log.info("Deleted object: {}", key);
        }
    }

    public String buildPublicUrl(String key) {
        return props.getEndpoint() + "/" + props.getBucketName() + "/" + key;
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".png";
        return filename.substring(filename.lastIndexOf('.'));
    }

    private String extractKeyFromUrl(String url) {
        String prefix = props.getEndpoint() + "/" + props.getBucketName() + "/";
        return url.startsWith(prefix) ? url.substring(prefix.length()) : null;
    }
}
