import logging

def setup_logging():
    """
    统一配置全局日志，并在启动时调用以避免在不同模块中重复配置
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Chroma 在部分版本组合下即使关闭 anonymized telemetry 仍会输出 Posthog 噪音日志。
    # 这里直接静音相关 logger，避免污染控制台和误导排查。
    for noisy_logger_name in (
        "chromadb.telemetry.product.posthog",
        "chromadb.telemetry.product",
        "posthog",
    ):
        noisy_logger = logging.getLogger(noisy_logger_name)
        noisy_logger.disabled = True
        noisy_logger.propagate = False
        noisy_logger.setLevel(logging.CRITICAL)

def get_logger(name: str) -> logging.Logger:
    """获取指定名称的 logger 实例"""
    return logging.getLogger(name)
