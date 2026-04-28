import pytest
from unittest.mock import patch, MagicMock
from backend.emails import enviar_email_adelanto_async, enviar_email_notas_doctor

@pytest.mark.asyncio
@patch('backend.emails.resend.Emails.send')
async def test_enviar_email_adelanto_success(mock_send):
    mock_send.return_value = {"id": "test_id"}
    result = await enviar_email_adelanto_async("test@example.com", "Juan", "10/10/2025 10:00", "Cardiología")
    assert result == True
    mock_send.assert_called_once()

@pytest.mark.asyncio
@patch('backend.emails.resend.Emails.send')
async def test_enviar_email_adelanto_failure(mock_send):
    mock_send.side_effect = Exception("Test Error")
    result = await enviar_email_adelanto_async("test@example.com", "Juan", "10/10/2025 10:00", "Cardiología")
    assert result == False
    mock_send.assert_called_once()

@pytest.mark.asyncio
@patch('backend.emails.resend.Emails.send')
async def test_enviar_email_notas_doctor_success(mock_send):
    mock_send.return_value = {"id": "test_id"}
    result = await enviar_email_notas_doctor("test@example.com", "Dr. Pepe", "Tómese las pastillas.")
    assert result == True
    mock_send.assert_called_once()

@pytest.mark.asyncio
@patch('backend.emails.resend.Emails.send')
async def test_enviar_email_notas_doctor_failure(mock_send):
    mock_send.side_effect = Exception("Test Error")
    result = await enviar_email_notas_doctor("test@example.com", "Dr. Pepe", "Tómese las pastillas.")
    assert result == False
    mock_send.assert_called_once()
