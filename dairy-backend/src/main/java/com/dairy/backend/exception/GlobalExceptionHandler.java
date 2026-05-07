package com.dairy.backend.exception;

import com.mongodb.MongoTimeoutException;
import com.dairy.backend.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(BadCredentialsException ex) {
        return new ResponseEntity<>(new ApiResponse<>(false, "Invalid username or password", null), HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler({MongoTimeoutException.class, DataAccessResourceFailureException.class})
    public ResponseEntity<ApiResponse<Void>> handleDatabaseUnavailable(Exception ex) {
        return new ResponseEntity<>(
                new ApiResponse<>(false, "Database is not reachable from the deployed backend. Check MongoDB Atlas network access / connection settings.", null),
                HttpStatus.SERVICE_UNAVAILABLE
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        return new ResponseEntity<>(new ApiResponse<>(false, ex.getMessage(), null), HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
