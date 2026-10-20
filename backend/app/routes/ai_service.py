"""
AI Service for Resume Builder
Handles Groq API integration with streaming support
Model names come from app/llm_config.py
"""
import os
from groq import Groq
from typing import Generator, List, Dict

from app.llm_config import PRIMARY_MODEL, FALLBACK_MODEL, REASONING_EFFORT

class AIService:
    def __init__(self):
        self.api_key = os.getenv('GROQ_API_KEY')
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        self.client = Groq(api_key=self.api_key)
        
        self.primary_model = PRIMARY_MODEL
        self.fallback_model = FALLBACK_MODEL
        self.reasoning_effort = REASONING_EFFORT
        
        # Generation parameters. Reasoning tokens are drawn from max_tokens,
        # so this is higher than the pre-gpt-oss value of 1024.
        self.temperature = 0.7
        self.max_tokens = 3000
        self.top_p = 0.9
    
    def stream_completion(self, messages: List[Dict[str, str]], 
                         model: str = None) -> Generator[str, None, None]:
        """
        Stream completion from Groq API
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (defaults to primary_model)
            
        Yields:
            Content chunks as they arrive
        """
        if model is None:
            model = self.primary_model
        
        try:
            stream = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                top_p=self.top_p,
                reasoning_effort=self.reasoning_effort,
                stream=True
            )
            
            for chunk in stream:
                if not chunk.choices:
                    continue
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        
        except Exception as e:
            # Try fallback model
            if model == self.primary_model:
                print(f"Primary model failed, trying fallback: {e}")
                yield from self.stream_completion(messages, model=self.fallback_model)
            else:
                raise Exception(f"AI service error: {str(e)}")
    
    def get_completion(self, messages: List[Dict[str, str]], 
                      model: str = None) -> str:
        """
        Get complete response (non-streaming)
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (defaults to primary_model)
            
        Returns:
            Complete response as string
        """
        if model is None:
            model = self.primary_model
        
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                top_p=self.top_p,
                reasoning_effort=self.reasoning_effort,
                stream=False
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            # Try fallback model
            if model == self.primary_model:
                print(f"Primary model failed, trying fallback: {e}")
                return self.get_completion(messages, model=self.fallback_model)
            else:
                raise Exception(f"AI service error: {str(e)}")
    
    def get_available_models(self) -> List[str]:
        """Return list of available models"""
        return [self.primary_model, self.fallback_model]
    
    def estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars ≈ 1 token)"""
        return len(text) // 4
    
    def truncate_history(self, messages: List[Dict[str, str]], 
                        max_tokens: int = 8000) -> List[Dict[str, str]]:
        """
        Truncate conversation history to fit within token limit
        Keeps system message and most recent messages
        """
        if not messages:
            return messages
        
        # Always keep system message
        system_msg = messages[0] if messages[0]['role'] == 'system' else None
        other_msgs = messages[1:] if system_msg else messages
        
        # Calculate tokens
        total_tokens = sum(self.estimate_tokens(msg['content']) for msg in messages)
        
        if total_tokens <= max_tokens:
            return messages
        
        # Keep most recent messages
        truncated = []
        current_tokens = self.estimate_tokens(system_msg['content']) if system_msg else 0
        
        for msg in reversed(other_msgs):
            msg_tokens = self.estimate_tokens(msg['content'])
            if current_tokens + msg_tokens <= max_tokens:
                truncated.insert(0, msg)
                current_tokens += msg_tokens
            else:
                break
        
        if system_msg:
            truncated.insert(0, system_msg)
        
        return truncated