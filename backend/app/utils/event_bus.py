import asyncio
import logging
from typing import Callable, Dict, List, Any, Awaitable

logger = logging.getLogger("nuvero.event_bus")

class EventBus:
    def __init__(self):
        self._listeners: Dict[str, List[Callable[[Any], Awaitable[None]]]] = {}

    def subscribe(self, event_type: str, listener: Callable[[Any], Awaitable[None]]):
        """
        Register an async subscriber for a specific event type.
        """
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        self._listeners[event_type].append(listener)
        logger.info(f"Subscribed listener to event: {event_type}")

    def unsubscribe(self, event_type: str, listener: Callable[[Any], Awaitable[None]]):
        """
        Remove a subscriber for an event type.
        """
        if event_type in self._listeners:
            try:
                self._listeners[event_type].remove(listener)
                logger.info(f"Unsubscribed listener from event: {event_type}")
            except ValueError:
                pass

    async def publish(self, event_type: str, data: Any):
        """
        Publish an event to all registered subscribers.
        Executed asynchronously as background tasks to prevent blocking the main process thread.
        """
        logger.info(f"Publishing event '{event_type}' with payload: {data}")
        if event_type in self._listeners:
            for listener in self._listeners[event_type]:
                # Wrap each listener in a safe task so failures in one subscriber do not affect others
                asyncio.create_task(self._safe_execute(listener, event_type, data))

    async def _safe_execute(self, listener: Callable[[Any], Awaitable[None]], event_type: str, data: Any):
        try:
            await listener(data)
        except Exception as e:
            logger.exception(f"Error handling event '{event_type}' in listener: {e}")

# Global instance of EventBus
event_bus = EventBus()
