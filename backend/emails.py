import os
import resend
import asyncio
from dotenv import load_dotenv
load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")

async def enviar_email_adelanto_async(email_destino: str, nombre_paciente: str, fecha_hora: str, especialidad: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html_content = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-w-md; margin: 0 auto; color: #1E293B;">
        <h2 style="color: #0F172A;">¡Buenas noticias, {nombre_paciente}!</h2>
        <p>Se ha liberado un hueco en la agenda y podemos adelantar tu cita de <strong>{especialidad}</strong>.</p>
        
        <div style="background-color: #F8FAFC; border-left: 4px solid #00a8cc; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>Nueva fecha propuesta:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 18px; color: #00a8cc;">{fecha_hora}</p>
        </div>
        
        <p style="font-size: 14px; color: #64748B;">
            Tienes un tiempo limitado para aceptar esta propuesta antes de que pase al siguiente paciente en la lista de espera.
        </p>
        
        <a href="{frontend_url}/home" style="display: inline-block; padding: 12px 24px; background-color: #00a8cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
            Revisar propuesta
        </a>
        
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94A3B8;">El equipo del Sistema Médico Kairós</p>
    </div>
    """

    params = {
        "from": "Kairós MED <onboarding@resend.dev>",
        "to": email_destino,
        "subject": "🔔 ¡Podemos adelantar tu cita médica!",
        "html": html_content
    }

    try:
        respuesta = await asyncio.to_thread(resend.Emails.send, params)
        print(f"[Email Service] Notificación enviada a {email_destino}: {respuesta}")
        return True
    except Exception as e:
        print(f"[Email Service] Error al enviar email a {email_destino}: {e}")
        return False
    

async def enviar_email_notas_doctor(email_destino: str, nombre_doctor: str, mensaje: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html_content = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-w-md; margin: 0 auto; color: #1E293B;">
        <h2 style="color: #0F172A;">¡Hola!</h2>
        <p>El doctor <strong>{nombre_doctor}</strong> ha dejado una nota importante sobre tu próxima cita:</p>
        <div style="background-color: #F8FAFC; border-left: 4px solid #00a8cc; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; color: #0F172A;"><strong>Nota del doctor:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748B;">{mensaje}</p>
        </div>
        <a href="{frontend_url}/home" style="display: inline-block; padding: 12px 24px; background-color: #00a8cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
            Revisar notas
        </a>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94A3B8;">El equipo del Sistema Médico Kairós</p>
    </div>
    """

    params = {
        "from": "Kairós MED <onboarding@resend.dev>",
        "to": email_destino,
        "subject": "🔔 Nota del doctor",
        "html": html_content
    }

    try:
        respuesta = await asyncio.to_thread(resend.Emails.send, params)
        print(f"[Email Service] Notificación enviada a {email_destino}: {respuesta}")
        return True
    except Exception as e:
        print(f"[Email Service] Error al enviar email a {email_destino}: {e}")
        return False


