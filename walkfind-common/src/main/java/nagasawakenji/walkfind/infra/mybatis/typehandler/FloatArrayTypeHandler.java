package nagasawakenji.walkfind.infra.mybatis.typehandler;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;

import java.sql.*;


public class FloatArrayTypeHandler extends BaseTypeHandler<float[]> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, float[] parameter, JdbcType jdbcType)
            throws SQLException {
        if (parameter == null) {
            ps.setNull(i, Types.ARRAY);
            return;
        }

        // pgvector に書く場合: jdbcType=OTHER を指定してもらう
        if (jdbcType == JdbcType.OTHER) {
            // pgvector は "[1,2,3]" 形式の文字列を受け取れる
            ps.setObject(i, toVectorLiteral(parameter), Types.OTHER);
            return;
        }

        // float4[] (real[]) として送る
        Float[] boxed = new Float[parameter.length];
        for (int k = 0; k < parameter.length; k++) boxed[k] = parameter[k];

        Array arr = ps.getConnection().createArrayOf("real", boxed);
        ps.setArray(i, arr);
    }

    @Override
    public float[] getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return toFloatArray(rs.getObject(columnName));
    }

    @Override
    public float[] getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return toFloatArray(rs.getObject(columnIndex));
    }

    @Override
    public float[] getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return toFloatArray(cs.getObject(columnIndex));
    }

    /**
     * JDBC driver が返す値を float[] に変換する。
     * - java.sql.Array: float4[]
     * - String: pgvector の "[0.1, 0.2, ...]" など
     */
    private float[] toFloatArray(Object value) throws SQLException {
        if (value == null) return null;

        if (value instanceof Array sqlArray) {
            return fromSqlArray(sqlArray);
        }

        if (value instanceof String s) {
            return parseVectorString(s);
        }

        // postgresql driver によっては PgArray が返るが Array を継承している
        // それ以外は文字列化してパースを試みる
        return parseVectorString(value.toString());
    }

    private float[] fromSqlArray(Array sqlArray) throws SQLException {
        Object raw = sqlArray.getArray();
        if (raw == null) return null;

        Object[] objs = (Object[]) raw;
        float[] out = new float[objs.length];
        for (int i = 0; i < objs.length; i++) {
            Object v = objs[i];
            if (v == null) out[i] = 0f;
            else if (v instanceof Float f) out[i] = f;
            else if (v instanceof Double d) out[i] = d.floatValue();
            else if (v instanceof Number n) out[i] = n.floatValue();
            else out[i] = Float.parseFloat(v.toString());
        }
        return out;
    }

    /**
     * pgvector の "[0.1,0.2,...]" / "(0.1,0.2,...)" などを想定してパース。
     * 余計な空白は許容。
     */
    private float[] parseVectorString(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return new float[0];

        // 先頭末尾の括弧を剥がす: [ ] / ( ) / { }
        char first = t.charAt(0);
        char last = t.charAt(t.length() - 1);
        if ((first == '[' && last == ']') || (first == '(' && last == ')') || (first == '{' && last == '}')) {
            t = t.substring(1, t.length() - 1).trim();
        }
        if (t.isEmpty()) return new float[0];

        // カンマ区切り
        String[] parts = t.split(",");
        float[] out = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i].trim();
            if (p.isEmpty() || p.equalsIgnoreCase("null")) {
                out[i] = 0f;
            } else {
                out[i] = Float.parseFloat(p);
            }
        }
        return out;
    }

    private String toVectorLiteral(float[] v) {
        // pgvector は "[1,2,3]" の文字列を受け取れる
        StringBuilder sb = new StringBuilder();
        sb.append('[');
        for (int i = 0; i < v.length; i++) {
            if (i > 0) sb.append(',');
            // locale 依存回避のため Float.toString
            sb.append(Float.toString(v[i]));
        }
        sb.append(']');
        return sb.toString();
    }
}