package nagasawakenji.walkfind.handler;

import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.exception.ApiError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handle(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(500)
                .body(new ApiError(e.getMessage(), "予期せぬサーバーエラーが発生しました"));
    }
}
