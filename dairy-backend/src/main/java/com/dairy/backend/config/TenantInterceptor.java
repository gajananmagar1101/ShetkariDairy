package com.dairy.backend.config;

import com.dairy.backend.util.SecurityUtils;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;
import org.springframework.data.mongodb.core.mapping.event.BeforeConvertEvent;

import java.lang.reflect.Method;

@Configuration
public class TenantInterceptor extends AbstractMongoEventListener<Object> {
    
    @Override
    public void onBeforeConvert(BeforeConvertEvent<Object> event) {
        Object source = event.getSource();
        
        // Skip user entity
        if (source.getClass().getSimpleName().equals("User") || source.getClass().getSimpleName().equals("Session")) {
            return;
        }

        try {
            Method getUserId = source.getClass().getMethod("getUserId");
            Object currentUserId = getUserId.invoke(source);
            if (currentUserId == null) {
                Method setUserId = source.getClass().getMethod("setUserId", String.class);
                setUserId.invoke(source, SecurityUtils.getCurrentUserId());
            }
        } catch (Exception e) {
            // Ignore if method does not exist
        }
    }
}
