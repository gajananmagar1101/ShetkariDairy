package com.dairy.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.mongodb.autoconfigure.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class MongoConfig {

    @Bean
    MongoClientSettingsBuilderCustomizer mongoTimeoutCustomizer(
            @Value("${app.mongo.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${app.mongo.read-timeout-ms:10000}") int readTimeoutMs,
            @Value("${app.mongo.server-selection-timeout-ms:5000}") int serverSelectionTimeoutMs
    ) {
        return builder -> builder
                .applyToSocketSettings(socket -> socket
                        .connectTimeout(connectTimeoutMs, TimeUnit.MILLISECONDS)
                        .readTimeout(readTimeoutMs, TimeUnit.MILLISECONDS))
                .applyToClusterSettings(cluster ->
                        cluster.serverSelectionTimeout(serverSelectionTimeoutMs, TimeUnit.MILLISECONDS))
                .applyToConnectionPoolSettings(pool -> pool
                        .minSize(2)
                        .maxSize(20)
                        .maxWaitTime(3000, TimeUnit.MILLISECONDS)
                        .maxConnectionIdleTime(60000, TimeUnit.MILLISECONDS));
    }
}
