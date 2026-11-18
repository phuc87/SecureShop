package com.secureshop.config;

import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@Configuration
public class MailConfig {

    /**
     * Google hiển thị App Password dạng "abcd efgh ijkl mnop". Người dùng hay dán nguyên cả dấu cách,
     * nên tự bỏ dấu cách để đăng nhập Gmail không bị lỗi 535.
     */
    @Bean
    static BeanPostProcessor gmailAppPasswordCleaner() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof JavaMailSenderImpl sender && sender.getPassword() != null) {
                    sender.setPassword(sender.getPassword().replaceAll("\\s+", ""));
                }
                return bean;
            }
        };
    }
}
