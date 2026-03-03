import asyncio
from patient_agent import PatientAgent
from doctor_agent import DoctorAgent

async def main():

    jid_patient = "patient_juan@localhost"
    jid_doctor = "doctor_maria@localhost"
    generic_password = "password123"

    patient_agent = PatientAgent(jid_patient, generic_password)
    doctor_agent = DoctorAgent(jid_doctor, generic_password)

    await patient_agent.start(auto_register=True)
    await doctor_agent.start(auto_register=True)

    print("Agents started. You have 2 minutes to see them running...")
    await asyncio.sleep(120)

    print("Stopping agents...")
    await patient_agent.stop()
    await doctor_agent.stop()
    print("Test completed.")

if __name__ == "__main__":

    asyncio.run(main())