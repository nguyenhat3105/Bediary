package com.bediary.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * RestClient config — replaces WebClient (webflux) which conflicts with spring-web/Tomcat.
 * RestClient is built into Spring Boot 3.2+ (spring-web), zero extra dependencies needed.
 */
@Configuration
public class WebClientConfig {

    @Bean
    public RestClient restClient() {
        return RestClient.builder()
                .build();
    }
}
