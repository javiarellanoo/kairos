import csv
import datetime
import random
import json
import unicodedata
import uuid
from faker import Faker

fake = Faker('es_ES')
def generate_specialties():
    csv_file = 'specialties.csv'
    specialties = ['Cardiología', 'Dermatología', 'Pediatría', 'Psiquiatría', 'Ginecología', 'Neurología', 'Oftalmología', 'Ortopedia', 'Traumatología', 'Medicina General', 'Oncología']
    # utf-8-sig ensures Excel on Windows preserves accented characters
    with open(csv_file, mode='w', newline='', encoding='utf-8-sig') as file:
        writer = csv.DictWriter(file, fieldnames=['name'])
        writer.writeheader()
        for specialty in specialties:
            writer.writerow({'name': specialty})
    print(f'{len(specialties)} especialidades generadas y guardadas en {csv_file}')
    return specialties

def generate_fake_email(name):
    domains = ['example.com', 'test.com', 'fakeemail.com']
    user_name = f"{name.split()[0].lower()[:4]}{name.split()[1].lower()[:4]}{random.randint(1, 1000)}"
    standarized_username = unicodedata.normalize('NFKD', user_name).encode('ASCII', 'ignore').decode('utf-8')
    return f"{standarized_username}@{random.choice(domains)}"

def generar_tarjeta_sanitaria():
    prefix = 'AN'
    suffix = ''.join(random.choices('0123456789', k=10))
    return f"{prefix} {suffix}"

def generar_preferencias_horarias():
    """Genera la estructura JSON de preferencias horarias basada en perfiles reales"""
    dias = ["lunes", "martes", "miercoles", "jueves", "viernes"]
    preferencias = {}
    
    perfil = random.choices(
        ['solo_mananas', 'solo_tardes', 'total_disponibilidad', 'turnos'],
        weights=[30, 30, 25, 15]
    )[0]
    
    if perfil == 'solo_mananas':
        for dia in dias: preferencias[dia] = ["M"]
    elif perfil == 'solo_tardes':
        for dia in dias: preferencias[dia] = ["T"]
    elif perfil == 'total_disponibilidad':
        for dia in dias: preferencias[dia] = ["M", "T"]
    elif perfil == 'turnos':
        # Para gente a turnos, cada día es una sorpresa (incluyendo días sin disponibilidad "[]")
        opciones = [["M"], ["T"], ["M", "T"], []]
        for dia in dias:
            preferencias[dia] = random.choice(opciones)
            
    return json.dumps(preferencias)

def generate_patient_data(num_patients):
    patients = []
    for _ in range(num_patients):
        name = fake.name()
        email = generate_fake_email(name)
        while email in [p['email'] for p in patients]:
            email = generate_fake_email(name)
        patient = {
            'name': name,
            'birth_date': fake.date_of_birth(minimum_age=0, maximum_age=100).strftime('%Y-%m-%d'),
            'email': email,
            'password': 'test_password',
            'phone': fake.phone_number().replace(' ', '').replace('-', ''),
            'DNI': fake.nif(),
            'tarjeta_sanitaria': generar_tarjeta_sanitaria(),
            'preferencias_horarias': generar_preferencias_horarias()
        }
        patients.append(patient)
    
    csv_file = 'patients.csv'
    with open(csv_file, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=patients[0].keys())
        writer.writeheader()
        writer.writerows(patients)
    print(f'{num_patients} pacientes generados y guardados en {csv_file}')

def generar_agenda_doctores():
    """Genera la agenda del médico para los próximos 15 días desde hoy, incluyendo días libres aleatorios"""
    hoy = datetime.date.today()
    agenda = {}
    
    # Perfiles de jornada para darle realismo
    # 1: Turno de mañana, 2: Turno de tarde, 3: Turno partido
    perfil_jornada = random.choices(['manana', 'tarde', 'partido'], weights=[50, 30, 20])[0]
    
    for i in range(15):
        dia_actual = hoy + datetime.timedelta(days=i)
        fecha_str = dia_actual.strftime('%Y-%m-%d')
        
        # weekday() devuelve 0 para Lunes y 6 para Domingo
        if dia_actual.weekday() >= 5: 
            # Fin de semana: no trabaja
            agenda[fecha_str] = []
        else:
            # Añadimos un 10% de probabilidad de que el médico tenga el día libre (guardia, vacaciones...)
            es_dia_libre = random.random() < 0.10
            
            if es_dia_libre:
                agenda[fecha_str] = [] # Array vacío significa que no hay disponibilidad ese día
            else:
                # Lunes a Viernes laboral: asignamos horario según su perfil
                if perfil_jornada == 'manana':
                    agenda[fecha_str] = ["08:00-15:00"]
                elif perfil_jornada == 'tarde':
                    agenda[fecha_str] = ["15:00-21:00"]
                elif perfil_jornada == 'partido':
                    # Jornada partida realista
                    agenda[fecha_str] = ["09:00-13:30", "16:00-19:30"]
                
    return json.dumps(agenda)

def get_specialties():
    specialties = csv.DictReader(open('specialties.csv', mode='r', encoding='utf-8-sig'))
    specialties_list = [row['name'] for row in specialties]
    return specialties_list

def generate_doctor_data(num_doctores):
    doctors = []
    specialties_list = get_specialties()
    counter = 0
    for _ in range(num_doctores):
        name = fake.name()
        email = generate_fake_email(name)
        while email in [d['email'] for d in doctors]:
            email = generate_fake_email(name)
        if counter < len(specialties_list):
            specialty = specialties_list[counter]
            counter += 1
        else:
            specialty = random.choice(specialties_list) 
        doctor = {
            'name': name,
            'email': email,
            'password': 'test_password',
            'phone': fake.phone_number().replace(' ', '').replace('-', ''),
            'duracion_cita': random.choice([15, 30, 45, 60]),
            'especialidad': specialty,
            'agenda': generar_agenda_doctores()
        }
        doctors.append(doctor)
    csv_file = 'doctors.csv'
    with open(csv_file, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=doctors[0].keys())
        writer.writeheader()
        writer.writerows(doctors)

def generar_intervalos (hora_inicio_str, hora_fin_str, fecha_str, duracion_cita):
    formato = "%Y-%m-%d %H:%M"
    inicio = datetime.datetime.strptime(f"{fecha_str} {hora_inicio_str}", formato)
    fin = datetime.datetime.strptime(f"{fecha_str} {hora_fin_str}", formato)

    intervalos = []
    actual = inicio
    while actual + datetime.timedelta(minutes=duracion_cita) <= fin:
        intervalos.append(actual.strftime(formato))
        actual += datetime.timedelta(minutes=duracion_cita)
    return intervalos

def cargar_datos():
    pacientes = list(csv.DictReader(open('patients.csv', mode='r', encoding='utf-8')))
    doctores = list(csv.DictReader(open('doctors.csv', mode='r', encoding='utf-8')))

    medicos_cabecera = [m for m in doctores if m['especialidad'] == 'Medicina General' or m['especialidad'] == 'Pediatría']
    especialistas = [m for m in doctores if m['especialidad'] != 'Medicina General' and m['especialidad'] != 'Pediatría']

    return pacientes, doctores, medicos_cabecera, especialistas

def generar_citas_volantes():
    pacientes, doctores, medicos_cabecera, especialistas = cargar_datos()
    mapa_paciente_cabecera = {}
    cupo_por_medico = {m['email']: [] for m in medicos_cabecera}

    for paciente in pacientes:
        if paciente['birth_date'] > (datetime.date.today() - datetime.timedelta(days=18*365)).strftime('%Y-%m-%d'):
            # Menores de 18 años van a pediatría
            medicos_disponibles = [m for m in medicos_cabecera if m['especialidad'] == 'Pediatría']
            medico_cabecera = random.choice(medicos_disponibles)
        else:
            # Mayores de 18 años van a medicina general
            medicos_disponibles = [m for m in medicos_cabecera if m['especialidad'] == 'Medicina General']
            medico_cabecera = random.choice(medicos_disponibles)
        mapa_paciente_cabecera[paciente['email']] = medico_cabecera
        cupo_por_medico[medico_cabecera['email']].append(paciente)
    
    volantes = []
    especialidades_destino = set([m['especialidad'] for m in especialistas])

    num_volantes = len(pacientes)*3

    for _ in range(num_volantes):
        paciente = random.choice(pacientes)
        medico_emisor = mapa_paciente_cabecera[paciente['email']]
        especialidad_destino = random.choice(list(especialidades_destino))

        prioridad, texto_prioridad = random.choices(
            [(3.0, "Alta"), (2.0, "Media"), (1.0, "Baja")],
            weights=[10, 20, 70]
        )[0]
        dias_desde_emision = random.randint(1, 30)
        fecha_emision = (datetime.date.today() - datetime.timedelta(days=dias_desde_emision)).strftime('%Y-%m-%d')
        volante = {
            'paciente': paciente['email'],
            'medico_emisor': medico_emisor['email'],
            'especialidad_destino': especialidad_destino,
            'prioridad_peso': prioridad,
            'motivo_texto': f"Volante - Derivación {texto_prioridad}",
            'estado': 'Pendiente',
            'emision': fecha_emision,
            'id': str(uuid.uuid4())
        }
        volantes.append(volante)
    
    citas_generadas = []
    estados_cita = ['Lista de Espera', 'Confirmada', 'Cancelada']
    motivos_cabecera = ['Consulta General', 'Revisión de analíticas', 'Renovación de medicación']

    volantes_por_esp = {esp: [v for v in volantes if v['especialidad_destino'] == esp] for esp in especialidades_destino}

    for medico in doctores:
        agenda = json.loads(medico['agenda'])
        duracion_cita = int(medico['duracion_cita'])
        es_cabecera = medico['especialidad'] in ['Medicina General', 'Pediatría']

        for fecha_str, franjas in agenda.items():
            if not franjas:
                continue

            huecos_dia = []
            for franja in franjas:
                hora_inicio_str, hora_fin_str = franja.split('-')
                huecos_dia.extend(generar_intervalos(hora_inicio_str, hora_fin_str, fecha_str, duracion_cita))

            num_citas_hoy = int(len(huecos_dia) * 0.4)
            huecos_ocupados = random.sample(huecos_dia, num_citas_hoy)

            for hueco in huecos_ocupados:
                if es_cabecera:
                    pacientes_medico = cupo_por_medico[medico['email']]
                    if not pacientes_medico:
                        continue

                    paciente = random.choice(pacientes_medico)
                    motivo = random.choice(motivos_cabecera)
                    peso_prioridad = 1.0
                else:
                    lista_volantes_esp = volantes_por_esp.get(medico['especialidad'], [])
                    volantes_disponibles = [v for v in lista_volantes_esp if v['estado'] == 'Pendiente']

                    if not volantes_disponibles:
                        continue

                    volante_usado = volantes_disponibles[0]
                    volante_usado['estado'] = 'Consumido'
                    paciente = next(p for p in pacientes if p['email'] == volante_usado['paciente'])
                    motivo = volante_usado['motivo_texto']
                    peso_prioridad = volante_usado['prioridad_peso']
                    id_volante = volante_usado['id']

                citas_generadas.append({
                    'paciente_dni': paciente['DNI'],
                    'medico': medico['email'],
                    'fecha_hora': hueco,
                    'especialidad': medico['especialidad'],
                    'motivo': motivo,
                    'prioridad_peso': peso_prioridad,
                    'id_volante': id_volante if not es_cabecera else None,
                    'estado': random.choice(estados_cita)
                })
        citas_generadas = sorted(citas_generadas, key=lambda x: x['fecha_hora'])
        with open('citas.csv', mode='w', newline='', encoding='utf-8') as file:
            fieldnames = ['paciente_dni', 'medico', 'fecha_hora', 'especialidad', 'motivo', 'prioridad_peso', 'id_volante', 'estado']
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(citas_generadas)
        
        with open('volantes.csv', mode='w', newline='', encoding='utf-8') as file:
            fieldnames = ['paciente', 'medico_emisor', 'especialidad_destino', 'prioridad_peso', 'motivo_texto', 'estado', 'emision', 'id']
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(volantes)
    

if __name__ == "__main__":
    generate_specialties()
    generate_patient_data(100)
    generate_doctor_data(30)
    generar_citas_volantes()
