package nagasawakenji.walkfind.handler;

import nagasawakenji.walkfind.exception.ApiError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handle(Exception e) {
        return ResponseEntity.status(500)
                .body(new ApiError(e.getMessage(), "予期せぬサーバーエラーが発生しました"));
    }
}
