package com.bediary.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Maps the local upload directory to the /uploads/** URL path.
 *
 * Example:
 *   File on disk:  uploads/families/abc-123/photo.jpg
 *   Public URL:    http://localhost:8080/api/v1/uploads/families/abc-123/photo.jpg
 *
 * In production: replace this with S3/CDN URLs and remove this handler.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${bediary.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Resolve the upload directory to an absolute path
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();

        registry
            .addResourceHandler("/uploads/**")
            .addResourceLocations("file:" + uploadPath + "/");
    }
}
