package nagasawakenji.walkfind.infra.mybatis.mapper;
import nagasawakenji.walkfind.domain.model.User;
import org.apache.ibatis.annotations.Mapper;
import java.util.Optional;

@Mapper
public interface UserMapper {

    // Cognito ID (users.id) を使用してユーザー情報を取得
    Optional<User> findById(String userId);

    // Cognitoでの新規登録後にユーザー基本情報を登録
    int insert(User user);

    // ユーザー名の変更を処理
    int updateUsername(User user);
}