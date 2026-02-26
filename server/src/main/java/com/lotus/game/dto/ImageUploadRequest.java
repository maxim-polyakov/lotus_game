package com.lotus.game.dto;

import lombok.Data;

@Data
public class ImageUploadRequest {
    private String image; // data:image/png;base64,... или base64
}
