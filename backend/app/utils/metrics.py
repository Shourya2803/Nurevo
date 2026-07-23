import time
from typing import Dict, Any

class MetricsManager:
    """
    In-memory metrics collector for Grafana/Prometheus dashboard integration.
    Tracks notification lifecycle events and active WebSocket connection stats.
    """
    def __init__(self):
        self.notifications_created = 0
        self.notifications_delivered = 0
        self.notifications_read = 0
        self.unread_notifications = 0
        self.notification_types: Dict[str, int] = {}
        self.total_delivery_time_ms = 0.0
        self.delivery_time_count = 0

    def record_created(self, n_type: str) -> None:
        self.notifications_created += 1
        self.unread_notifications += 1
        self.notification_types[n_type] = self.notification_types.get(n_type, 0) + 1

    def record_delivered(self, delivery_time_ms: float = 0.0) -> None:
        self.notifications_delivered += 1
        if delivery_time_ms > 0:
            self.total_delivery_time_ms += delivery_time_ms
            self.delivery_time_count += 1

    def record_read(self) -> None:
        self.notifications_read += 1
        if self.unread_notifications > 0:
            self.unread_notifications -= 1

    def get_average_delivery_time(self) -> float:
        if self.delivery_time_count == 0:
            return 0.0
        return self.total_delivery_time_ms / self.delivery_time_count

    def get_summary(self, connected_users: int, websocket_connections: int) -> Dict[str, Any]:
        return {
            "notifications_created": self.notifications_created,
            "notifications_delivered": self.notifications_delivered,
            "notifications_read": self.notifications_read,
            "unread_notifications": self.unread_notifications,
            "notification_types": self.notification_types,
            "average_delivery_time_ms": round(self.get_average_delivery_time(), 2),
            "connected_users": connected_users,
            "websocket_connections": websocket_connections
        }

    def to_prometheus_format(self, connected_users: int, websocket_connections: int) -> str:
        """
        Converts in-memory metrics to Prometheus text format.
        """
        lines = [
            "# HELP nurevo_notifications_created_total Total number of notifications created",
            "# TYPE nurevo_notifications_created_total counter",
            f"nurevo_notifications_created_total {self.notifications_created}",
            "",
            "# HELP nurevo_notifications_delivered_total Total number of notifications delivered",
            "# TYPE nurevo_notifications_delivered_total counter",
            f"nurevo_notifications_delivered_total {self.notifications_delivered}",
            "",
            "# HELP nurevo_notifications_read_total Total number of notifications read",
            "# TYPE nurevo_notifications_read_total counter",
            f"nurevo_notifications_read_total {self.notifications_read}",
            "",
            "# HELP nurevo_unread_notifications_current Current number of unread notifications",
            "# TYPE nurevo_unread_notifications_current gauge",
            f"nurevo_unread_notifications_current {self.unread_notifications}",
            "",
            "# HELP nurevo_notification_delivery_time_average_ms Average notification delivery time in milliseconds",
            "# TYPE nurevo_notification_delivery_time_average_ms gauge",
            f"nurevo_notification_delivery_time_average_ms {self.get_average_delivery_time()}",
            "",
            "# HELP nurevo_connected_users_current Number of online users",
            "# TYPE nurevo_connected_users_current gauge",
            f"nurevo_connected_users_current {connected_users}",
            "",
            "# HELP nurevo_websocket_connections_current Number of active WebSocket connections",
            "# TYPE nurevo_websocket_connections_current gauge",
            f"nurevo_websocket_connections_current {websocket_connections}"
        ]

        # Break down by type
        for n_type, count in self.notification_types.items():
            lines.append(f'nurevo_notification_by_type_total{{type="{n_type}"}} {count}')

        return "\n".join(lines)


# Global instance of MetricsManager
metrics_manager = MetricsManager()
