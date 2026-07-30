import { buildAuthUrl } from "../iam";
import styles from "./LoginScreen.module.css";

const LoginScreen: React.FC = () => {
  const handleIamLogin = async () => {
    try {
      const url = await buildAuthUrl();
      window.location.href = url;
    } catch (e) {
      alert(
        `IAM 登录失败: ${e instanceof Error ? e.message : "未知错误"}`,
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logo}>🎡</div>
      <h1 className={styles.title}>TransCircle 转盘</h1>
      <p className={styles.subtitle}>登录以开始游戏</p>

      <button className={styles.iamBtn} onClick={handleIamLogin}>
        <span className={styles.iamIcon}>🔑</span>
        使用 IAM 登录
      </button>
    </div>
  );
};

export default LoginScreen;
