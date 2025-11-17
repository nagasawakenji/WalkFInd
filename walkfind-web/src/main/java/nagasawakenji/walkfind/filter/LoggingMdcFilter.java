package nagasawakenji.walkfind.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.io.IOException;
import jakarta.servlet.Filter;
@Slf4j
@Component
public class LoggingMdcFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        try {
            HttpServletRequest request = (HttpServletRequest) req;
            MDC.put("method", request.getMethod());
            MDC.put("path", request.getRequestURI());
            MDC.put("userId", "anonymous"); // Web ではJWTなし

            chain.doFilter(req, res);
        } finally {
            MDC.clear();
        }
    }
}