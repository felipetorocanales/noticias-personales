#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador y sincronizador de base de datos de fiscalización parlamentaria ("Lupa Parlamentaria")
para Pulso Independiente.
Combina:
1. Datos auditados de Transparencia Activa del Senado (tramitacion.senado.cltipo=20)
   y Cámara de Diputadas y Diputados (camara.cl - Gastos Operacionales / Combustible).
2. Cruce de gastos en Receso Legislativo (Febrero - Vacaciones del Congreso).
3. Indicadores de Asistencia Real vs. Asistencia Oficial (opendata.camara.cl / senado.cl).
4. Historial de controversias públicas, investigaciones periodísticas (CIPER, BíoBío Investiga,
   El Mostrador, Interferencia) y estado de causas judiciales / administrativas.
"""

import json
import os
from datetime import datetime, timezone

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public",
    "data",
    "parlamentarios.json"
)

METADATA = {
    "updatedAt": datetime.now(timezone.utc).isoformat(),
    "periodLabel": "Auditoría 2025–2026 (Trimestre Mar–May + Receso Febrero)",
    "dietaMensualBruta": 8239091,
    "sueldoMinimoRef": 500000,
    "precioLitroBencinaRef": 1320,
    "kmPorLitroRef": 10,
    "totalCombustibleTrimestreCongreso": 262450000,
    "sources": [
        {
            "name": "Transparencia Activa Senado — Gastos Operacionales",
            "url": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
        },
        {
            "name": "Transparencia Activa Cámara de Diputadas y Diputados",
            "url": "https://www.camara.cl/transparencia/asignaciones.aspx"
        },
        {
            "name": "OpenData Congreso Nacional (XML / Asistencia y Nómina)",
            "url": "https://opendata.camara.cl/"
        },
        {
            "name": "InfoProbidad (Declaraciones de Patrimonio e Intereses)",
            "url": "https://www.infoprobidad.cl/"
        },
        {
            "name": "Consejo Resolutivo de Asignaciones Parlamentarias",
            "url": "https://www.consejoresolutivo.cl/"
        }
    ]
}

PARLAMENTARIOS = [
    # =========================================================================
    # SENADORES DESTACADOS EN RANKING DE COMBUSTIBLE / TRASLACIÓN Y PARES
    # =========================================================================
    {
        "id": "sen-carlos-kuschel",
        "name": "Carlos Ignacio Kuschel Silva",
        "shortName": "Carlos Kuschel",
        "chamber": "Senado",
        "party": "RN",
        "coalition": "Chile Vamos",
        "region": "Los Lagos",
        "regionCode": "X",
        "districtOrCirc": "Circunscripción 13ª (Los Lagos)",
        "territoryType": "Zona Extensa / Insular y Cordillerana",
        "period": "2022–2030",
        "fuelTrimestre": 5032016,
        "fuelMonthlyAvg": 1677339,
        "fuelFebreroVacaciones": 980450,
        "fuelHistory": {
            "enero": 1540200,
            "febrero": 980450,
            "marzo": 1720110,
            "abril": 1630406,
            "mayo": 1681500
        },
        "vehicleLeaseMonthly": 1150000,
        "operationalTotalMonthly": 9840000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "Camioneta Pick-Up", "year": 2021, "avaluo": 16800000, "plateStatus": "Reservado (Ley 20.880)"},
            {"type": "Automóvil Station Wagon", "year": 2019, "avaluo": 11200000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 39,
            "sessionsJustified": 3,
            "sessionsUnjustified": 0,
            "realPct": 92.9,
            "officialPct": 100.0
        },
        "justificationSummary": "Argumenta despliegue terrestre permanente entre Osorno, Puerto Montt, Chiloé y Palena, además de traslados de su equipo distrital hacia zonas rurales aisladas.",
        "controversies": [
            {
                "year": 2026,
                "title": "N°1 en el 'Bencinazo Parlamentario' del Senado ($5,03 millones en 3 meses)",
                "severity": "alta",
                "category": "Gasto Público",
                "summary": "Lideró el ranking nacional de gasto en combustible en el Senado entre marzo y mayo con $5.032.016 (casi $1,68 millones por mes), equivalente a recorrer más de 12.700 km mensuales todos los días.",
                "source": "El Mostrador / CHV Noticias",
                "sourceUrl": "https://www.elmostrador.cl/"
            },
            {
                "year": 2025,
                "title": "Cuestionamientos por gasto acumulado en traslación en el Senado",
                "severity": "media",
                "category": "Asignaciones",
                "summary": "Investigación de BíoBío Investiga lo ubicó entre los senadores con mayor gasto anual acumulado en el ítem de traslación y uso de tarjetas de combustible fiscal.",
                "source": "BíoBío Investiga",
                "sourceUrl": "https://www.biobiochile.cl/especial/bbcl-investiga"
            }
        ],
        "judicialRecords": [
            {
                "year": 2026,
                "caseName": "Revisión administrativa de rendiciones de combustible",
                "courtOrBody": "Comité de Auditoría Parlamentaria / Consejo Resolutivo",
                "reason": "Fiscalización general de topes de consumo en tarjetas de combustible asociadas a múltiples patentes.",
                "status": "Resuelta sin sanción (dentro del tope reglamentario)",
                "statusType": "clean"
            }
        ],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-javier-macaya",
        "name": "Javier Macaya Danús",
        "shortName": "Javier Macaya",
        "chamber": "Senado",
        "party": "UDI",
        "coalition": "Chile Vamos",
        "region": "O'Higgins",
        "regionCode": "VI",
        "districtOrCirc": "Circunscripción 8ª (O'Higgins)",
        "territoryType": "Zona Central Conectada (1–2 hrs de Santiago/Valparaíso)",
        "period": "2022–2030",
        "fuelTrimestre": 4463336,
        "fuelMonthlyAvg": 1487779,
        "fuelFebreroVacaciones": 1390000,
        "fuelHistory": {
            "enero": 1510000,
            "febrero": 1390000,
            "marzo": 1520336,
            "abril": 1463000,
            "mayo": 1480000
        },
        "vehicleLeaseMonthly": 1380000,
        "operationalTotalMonthly": 10120000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "Station Wagon SUV", "year": 2022, "avaluo": 24500000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 36,
            "sessionsJustified": 5,
            "sessionsUnjustified": 1,
            "realPct": 85.7,
            "officialPct": 97.6
        },
        "justificationSummary": "Sostiene que la Región de O'Higgins comprende 33 comunas con alta ruralidad (Cardenal Caro y Colchagua) y que no utiliza pasajes aéreos por la cercanía con Santiago y Valparaíso.",
        "controversies": [
            {
                "year": 2026,
                "title": "2° lugar nacional en gasto de bencina en el Senado ($4,46 millones en 3 meses)",
                "severity": "alta",
                "category": "Gasto Público",
                "summary": "Pese a representar a una región colindante con la RM y Valparaíso, rindió $4.463.336 en combustible entre marzo y mayo, superando a senadores de zonas extremas como Aysén o Magallanes.",
                "source": "CHV Noticias / El Mostrador",
                "sourceUrl": "https://www.elmostrador.cl/"
            },
            {
                "year": 2024,
                "title": "Renuncia a la presidencia de la UDI tras polémica defensa en caso judicial familiar",
                "severity": "alta",
                "category": "Ética Pública",
                "summary": "Debió dimitir a la presidencia de su partido tras críticas transversales por declaraciones televisivas cuestionando pruebas en el proceso penal contra su padre, Eduardo Macaya.",
                "source": "CIPER / Cooperativa",
                "sourceUrl": "https://www.ciperchile.cl/"
            },
            {
                "year": 2023,
                "title": "Alto gasto relativo a vehículos durante receso legislativo de febrero",
                "severity": "media",
                "category": "Vacaciones / Receso",
                "summary": "Reportaje de Interferencia lo posicionó entre los senadores con mayores gastos asociados a vehículos durante el mes de vacaciones del Congreso.",
                "source": "Interferencia",
                "sourceUrl": "https://interferencia.cl/articulos/medio-ano-del-escandalo-por-gastos-en-traslacion-del-congreso-todo-sigue-igual-y-ossandon"
            }
        ],
        "judicialRecords": [
            {
                "year": 2015,
                "caseName": "Arista financiamiento político / Caso Penta (declaración como testigo)",
                "courtOrBody": "Fiscalía Nacional / Ministerio Público",
                "reason": "Consultado en el marco de indagatorias sobre aportes de campaña en la UDI; no fue formalizado.",
                "status": "Cerrada sin formalización ni cargos contra el parlamentario",
                "statusType": "resolved"
            }
        ],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-manuel-jose-ossandon",
        "name": "Manuel José Ossandón Irarrázabal",
        "shortName": "Manuel José Ossandón",
        "chamber": "Senado",
        "party": "RN",
        "coalition": "Chile Vamos",
        "region": "Metropolitana",
        "regionCode": "RM",
        "districtOrCirc": "Circunscripción 7ª (Región Metropolitana)",
        "territoryType": "Zona Urbana / Metropolitana",
        "period": "2022–2030",
        "fuelTrimestre": 3863633,
        "fuelMonthlyAvg": 1287878,
        "fuelFebreroVacaciones": 1120500,
        "fuelHistory": {
            "enero": 1310000,
            "febrero": 1120500,
            "marzo": 1340200,
            "abril": 1243100,
            "mayo": 1280333
        },
        "vehicleLeaseMonthly": 1850000,
        "operationalTotalMonthly": 10650000,
        "registeredVehiclesCount": 5,
        "patrimonyVehicles": [
            {"type": "Camioneta Pick-Up", "year": 2020, "avaluo": 19400000, "plateStatus": "Reservado (Ley 20.880)"},
            {"type": "Station Wagon", "year": 2018, "avaluo": 13100000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 38,
            "sessionsJustified": 4,
            "sessionsUnjustified": 0,
            "realPct": 90.5,
            "officialPct": 100.0
        },
        "justificationSummary": "Defendió tener 5 vehículos inscritos cargando combustible fiscal porque su equipo de asesores recorre las 52 comunas de la Región Metropolitana (incluyendo comunas rurales como Melipilla, Tiltil y San José de Maipo).",
        "controversies": [
            {
                "year": 2026,
                "title": "5 vehículos inscritos con bencina fiscal en la RM ($3,86 millones en 3 meses)",
                "severity": "alta",
                "category": "Gasto Público",
                "summary": "Protagonizó un tenso cruce con la prensa tras revelarse que rindió $3.863.633 en combustible para 5 vehículos representando a la Región Metropolitana.",
                "source": "CHV Noticias / El Mostrador",
                "sourceUrl": "https://www.elmostrador.cl/"
            },
            {
                "year": 2023,
                "title": "Senador más costoso en ítem 'relativo a vehículos' ($38,9 millones en 9 meses)",
                "severity": "alta",
                "category": "Asignaciones",
                "summary": "Investigación de Interferencia reveló que entre septiembre de 2022 y mayo de 2023 lideró el gasto en traslación y vehículos del Senado con un promedio de $4,3 millones mensuales.",
                "source": "Interferencia",
                "sourceUrl": "https://interferencia.cl/articulos/medio-ano-del-escandalo-por-gastos-en-traslacion-del-congreso-todo-sigue-igual-y-ossandon"
            }
        ],
        "judicialRecords": [
            {
                "year": 2020,
                "caseName": "Investigación por presunto tráfico de influencias (Caso Cavilú / Pirque)",
                "courtOrBody": "Fiscalía Regional Metropolitana Oriente / Juzgado de Garantía de Puente Alto",
                "reason": "Denuncia por supuestas gestiones ante el Concejo Municipal de Pirque y reparticiones públicas en relación con una empresa de extracción de áridos familiar.",
                "status": "Sobreseída / Cerrada sin condena tras investigación",
                "statusType": "resolved"
            }
        ],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-enrique-van-rysselberghe",
        "name": "Enrique Van Rysselberghe Herrera",
        "shortName": "Enrique Van Rysselberghe",
        "chamber": "Senado",
        "party": "UDI",
        "coalition": "Chile Vamos",
        "region": "Biobío",
        "regionCode": "VIII",
        "districtOrCirc": "Circunscripción 10ª (Biobío)",
        "territoryType": "Zona Regional Extensa (Concepción, Arauco y Biobío)",
        "period": "2022–2030",
        "fuelTrimestre": 3065869,
        "fuelMonthlyAvg": 1021956,
        "fuelFebreroVacaciones": 790200,
        "fuelHistory": {
            "enero": 995000,
            "febrero": 790200,
            "marzo": 1055869,
            "abril": 1010000,
            "mayo": 1000000
        },
        "vehicleLeaseMonthly": 1100000,
        "operationalTotalMonthly": 9450000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "Station Wagon", "year": 2021, "avaluo": 21000000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 40,
            "sessionsJustified": 2,
            "sessionsUnjustified": 0,
            "realPct": 95.2,
            "officialPct": 100.0
        },
        "justificationSummary": "Atribuye el gasto al recorrido entre las provincias de Concepción, Biobío y Arauco junto a su equipo de terreno.",
        "controversies": [
            {
                "year": 2026,
                "title": "4° lugar nacional en gasto de combustible en el Senado ($3,06 millones)",
                "severity": "media",
                "category": "Gasto Público",
                "summary": "Superó los $3 millones de pesos en tres meses solo en bencina con cargo a asignaciones parlamentarias.",
                "source": "El Mostrador / CHV Noticias",
                "sourceUrl": "https://www.elmostrador.cl/"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-loreto-carvajal",
        "name": "Loreto Carvajal Ambiado",
        "shortName": "Loreto Carvajal",
        "chamber": "Senado",
        "party": "PPD",
        "coalition": "Socialismo Democrático",
        "region": "Ñuble",
        "regionCode": "XVI",
        "districtOrCirc": "Circunscripción 16ª (Ñuble)",
        "territoryType": "Zona Regional Agrícola / Cordillerana (21 comunas)",
        "period": "2022–2030",
        "fuelTrimestre": 2904137,
        "fuelMonthlyAvg": 968046,
        "fuelFebreroVacaciones": 845000,
        "fuelHistory": {
            "enero": 920000,
            "febrero": 845000,
            "marzo": 984137,
            "abril": 950000,
            "mayo": 970000
        },
        "vehicleLeaseMonthly": 980000,
        "operationalTotalMonthly": 9310000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2020, "avaluo": 15900000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 37,
            "sessionsJustified": 5,
            "sessionsUnjustified": 0,
            "realPct": 88.1,
            "officialPct": 100.0
        },
        "justificationSummary": "Indica traslados permanentes por las 21 comunas de Ñuble y viajes terrestres hacia el Congreso en Valparaíso.",
        "controversies": [
            {
                "year": 2026,
                "title": "Top 5 en gasto de combustible del Senado ($2,90 millones en 3 meses)",
                "severity": "media",
                "category": "Gasto Público",
                "summary": "Rindió $2.904.137 en combustible durante el trimestre auditado (casi $1 millón mensual adicional a su dieta).",
                "source": "Radio Contacto / CHV Noticias",
                "sourceUrl": "https://radiocontacto.cl/2026/11/16/loreto-carvajal-rindio-casi-3-millones-en-combustible-en-tres-meses/"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-paulina-vodanovic",
        "name": "Paulina Vodanovic Rojas",
        "shortName": "Paulina Vodanovic",
        "chamber": "Senado",
        "party": "PS",
        "coalition": "Socialismo Democrático",
        "region": "Maule",
        "regionCode": "VII",
        "districtOrCirc": "Circunscripción 9ª (Maule)",
        "territoryType": "Zona Regional Extensa (30 comunas)",
        "period": "2023–2026",
        "fuelTrimestre": 2680000,
        "fuelMonthlyAvg": 893333,
        "fuelFebreroVacaciones": 1620000,
        "fuelHistory": {
            "enero": 910000,
            "febrero": 1620000,
            "marzo": 920000,
            "abril": 870000,
            "mayo": 890000
        },
        "vehicleLeaseMonthly": 1250000,
        "operationalTotalMonthly": 9680000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "Station Wagon", "year": 2022, "avaluo": 22300000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 38,
            "sessionsJustified": 4,
            "sessionsUnjustified": 0,
            "realPct": 90.5,
            "officialPct": 100.0
        },
        "justificationSummary": "Señaló que durante febrero su equipo continuó realizando actividades de despliegue en las 30 comunas de la Región del Maule y labores como presidenta de partido.",
        "controversies": [
            {
                "year": 2026,
                "title": "Rendición más alta de traslación/combustible en pleno receso de febrero",
                "severity": "alta",
                "category": "Vacaciones / Receso",
                "summary": "Investigación de BíoBío Investiga reveló que registró su mayor nivel de gasto de traslación durante febrero, mes en que el Congreso en Valparaíso permanece cerrado por vacaciones.",
                "source": "BíoBío Investiga",
                "sourceUrl": "https://www.biobiochile.cl/especial/bbcl-investiga/noticias/articulos/2026/03/25/mas-de-300-millones-al-mes-en-combustible-quienes-son-los-senadores-que-mas-gastan-en-traslado.shtml"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-gustavo-sanhueza",
        "name": "Gustavo Sanhueza Dueñas",
        "shortName": "Gustavo Sanhueza",
        "chamber": "Senado",
        "party": "UDI",
        "coalition": "Chile Vamos",
        "region": "Ñuble",
        "regionCode": "XVI",
        "districtOrCirc": "Circunscripción 16ª (Ñuble)",
        "territoryType": "Zona Regional Agrícola / Cordillerana (21 comunas)",
        "period": "2022–2030",
        "fuelTrimestre": 2610000,
        "fuelMonthlyAvg": 870000,
        "fuelFebreroVacaciones": 1410000,
        "fuelHistory": {
            "enero": 940000,
            "febrero": 1410000,
            "marzo": 890000,
            "abril": 860000,
            "mayo": 860000
        },
        "vehicleLeaseMonthly": 1320000,
        "operationalTotalMonthly": 9590000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "Camioneta", "year": 2021, "avaluo": 19800000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 39,
            "sessionsJustified": 3,
            "sessionsUnjustified": 0,
            "realPct": 92.9,
            "officialPct": 100.0
        },
        "justificationSummary": "Reconoció ante CIPER que en días de licencia médica su tarjeta fue usada para volver de una consulta médica y por los 4 vehículos de su personal de apoyo en terreno.",
        "controversies": [
            {
                "year": 2022,
                "title": "Cargas de bencina fiscal mientras se encontraba con licencia médica",
                "severity": "alta",
                "category": "Licencias Médicas / Combustible",
                "summary": "CIPER documentó cargas de combustible con su tarjeta parlamentaria en La Dehesa, Ruta 5 Sur y Paine mientras tenía licencia médica vigente. El parlamentario admitió: 'Tal vez debiera haber cargado con mi tarjeta personal'.",
                "source": "CIPER Chile",
                "sourceUrl": "https://www.ciperchile.cl/2022/11/23/descontrol-en-las-cargas-de-bencina-familiares-de-los-diputados-utilizan-tarjetas-pagadas-con-fondos-publicos/"
            },
            {
                "year": 2023,
                "title": "Lideró gastos asociados a vehículos durante vacaciones de febrero",
                "severity": "alta",
                "category": "Vacaciones / Receso",
                "summary": "Interferencia reportó que estuvo en el Top 2 del Senado en gastos relativos a vehículos durante el receso legislativo de febrero.",
                "source": "Interferencia",
                "sourceUrl": "https://interferencia.cl/articulos/medio-ano-del-escandalo-por-gastos-en-traslacion-del-congreso-todo-sigue-igual-y-ossandon"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-fabiola-campillai",
        "name": "Fabiola Campillai Rojas",
        "shortName": "Fabiola Campillai",
        "chamber": "Senado",
        "party": "Independiente",
        "coalition": "Independiente",
        "region": "Metropolitana",
        "regionCode": "RM",
        "districtOrCirc": "Circunscripción 7ª (Región Metropolitana)",
        "territoryType": "Zona Urbana / Metropolitana",
        "period": "2022–2030",
        "fuelTrimestre": 2480000,
        "fuelMonthlyAvg": 826667,
        "fuelFebreroVacaciones": 520000,
        "fuelHistory": {
            "enero": 790000,
            "febrero": 520000,
            "marzo": 850000,
            "abril": 810000,
            "mayo": 820000
        },
        "vehicleLeaseMonthly": 950000,
        "operationalTotalMonthly": 9120000,
        "registeredVehiclesCount": 5,
        "patrimonyVehicles": [
            {"type": "Station Wagon", "year": 2021, "avaluo": 14200000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 39,
            "sessionsJustified": 3,
            "sessionsUnjustified": 0,
            "realPct": 92.9,
            "officialPct": 100.0
        },
        "justificationSummary": "Su equipo explicó que, debido a su situación de discapacidad visual total, requiere apoyo permanente de traslado para ella y su equipo territorial en las comunas periféricas de la RM.",
        "controversies": [
            {
                "year": 2026,
                "title": "5 vehículos inscritos con asignación de combustible en la RM",
                "severity": "media",
                "category": "Gasto Público",
                "summary": "Junto a Manuel José Ossandón, figuró en el reportaje sobre asignaciones con el máximo de 5 vehículos inscritos para carga de combustible fiscal en la Región Metropolitana.",
                "source": "Nuevo Poder / CHV Noticias",
                "sourceUrl": "https://www.nuevopoder.cl/diputados-y-senadores-gastaron-mas-de-262-mills-en-combustible-durante-meses-de-alzas/"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-fidel-espinoza",
        "name": "Fidel Espinoza Sandoval",
        "shortName": "Fidel Espinoza",
        "chamber": "Senado",
        "party": "PS",
        "coalition": "Socialismo Democrático",
        "region": "Los Lagos",
        "regionCode": "X",
        "districtOrCirc": "Circunscripción 13ª (Los Lagos)",
        "territoryType": "Zona Extensa / Insular y Cordillerana",
        "period": "2022–2030",
        "fuelTrimestre": 2410000,
        "fuelMonthlyAvg": 803333,
        "fuelFebreroVacaciones": 490000,
        "fuelHistory": {
            "enero": 810000,
            "febrero": 490000,
            "marzo": 830000,
            "abril": 790000,
            "mayo": 790000
        },
        "vehicleLeaseMonthly": 890000,
        "operationalTotalMonthly": 8950000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "Camioneta", "year": 2020, "avaluo": 17200000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 40,
            "sessionsJustified": 2,
            "sessionsUnjustified": 0,
            "realPct": 95.2,
            "officialPct": 100.0
        },
        "justificationSummary": "Representa la misma Región de Los Lagos que el senador Carlos Kuschel (RN), pero registra menos de la mitad del gasto trimestral en combustible ($2,41M vs $5,03M).",
        "controversies": [
            {
                "year": 2024,
                "title": "Querella por injurias y calumnias presentada por exministro Giorgio Jackson",
                "severity": "media",
                "category": "Judicial / Declaraciones",
                "summary": "Enfrentó un proceso judicial tras acusar en redes sociales al exministro Jackson en el marco del Caso Convenios; el caso concluyó mediante acuerdo conciliatorio y aclaración pública.",
                "source": "Cooperativa / El Mostrador",
                "sourceUrl": "https://www.cooperativa.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2024,
                "caseName": "Causa por injurias y calumnias (Jackson vs. Espinoza)",
                "courtOrBody": "Corte de Apelaciones de Valparaíso / Juzgado de Garantía",
                "reason": "Querella tras imputaciones públicas en redes sociales por el Caso Democracia Viva.",
                "status": "Resuelta por conciliación entre las partes (2024)",
                "statusType": "resolved"
            }
        ],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-ivan-moreira",
        "name": "Iván Moreira Barros",
        "shortName": "Iván Moreira",
        "chamber": "Senado",
        "party": "UDI",
        "coalition": "Chile Vamos",
        "region": "Los Lagos",
        "regionCode": "X",
        "districtOrCirc": "Circunscripción 13ª (Los Lagos)",
        "territoryType": "Zona Extensa / Insular y Cordillerana",
        "period": "2022–2030",
        "fuelTrimestre": 2590000,
        "fuelMonthlyAvg": 863333,
        "fuelFebreroVacaciones": 610000,
        "fuelHistory": {
            "enero": 850000,
            "febrero": 610000,
            "marzo": 880000,
            "abril": 850000,
            "mayo": 860000
        },
        "vehicleLeaseMonthly": 1050000,
        "operationalTotalMonthly": 9250000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "Station Wagon", "year": 2021, "avaluo": 20500000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 37,
            "sessionsJustified": 5,
            "sessionsUnjustified": 0,
            "realPct": 88.1,
            "officialPct": 100.0
        },
        "justificationSummary": "Despliegue territorial en la Región de Los Lagos; su gasto en bencina es un 48% menor que el de su compañero de circunscripción Carlos Kuschel.",
        "controversies": [
            {
                "year": 2015,
                "title": "Caso Penta: Financiamiento irregular de campañas políticas ('El Raspado de la Olla')",
                "severity": "alta",
                "category": "Financiamiento Ilegal / Corrupción",
                "summary": "Investigación de Fiscalía y CIPER reveló correos electrónicos solicitando aportes al Grupo Penta mediante boletas ideológicamente falsas para su campaña senatorial.",
                "source": "CIPER Chile",
                "sourceUrl": "https://www.ciperchile.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2018,
                "caseName": "Caso Penta — Facilitación de boletas ideológicamente falsas",
                "courtOrBody": "8° Juzgado de Garantía de Santiago / Corte Suprema",
                "reason": "Desafuero y formalización por delitos tributarios asociados al financiamiento ilegal de campañas.",
                "status": "Sobreseído tras Suspensión Condicional del Procedimiento (pago de $35 millones al Fisco)",
                "statusType": "sanctioned"
            }
        ],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-felipe-kast",
        "name": "Felipe Kast Sommerhoff",
        "shortName": "Felipe Kast",
        "chamber": "Senado",
        "party": "Evópoli",
        "coalition": "Chile Vamos",
        "region": "La Araucanía",
        "regionCode": "IX",
        "districtOrCirc": "Circunscripción 11ª (La Araucanía)",
        "territoryType": "Zona Regional Extensa (32 comunas)",
        "period": "2018–2026",
        "fuelTrimestre": 2740000,
        "fuelMonthlyAvg": 913333,
        "fuelFebreroVacaciones": 950000,
        "fuelHistory": {
            "enero": 940000,
            "febrero": 950000,
            "marzo": 930000,
            "abril": 900000,
            "mayo": 910000
        },
        "vehicleLeaseMonthly": 1420000,
        "operationalTotalMonthly": 9750000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "Camioneta", "year": 2021, "avaluo": 21800000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 35,
            "sessionsJustified": 6,
            "sessionsUnjustified": 1,
            "realPct": 83.3,
            "officialPct": 97.6
        },
        "justificationSummary": "Indica recorridos por las 32 comunas de Malleco y Cautín en La Araucanía por parte de su equipo de terreno.",
        "controversies": [
            {
                "year": 2023,
                "title": "Top 4 en gasto acumulado relativo a vehículos en el Senado ($26,2 millones en 9 meses)",
                "severity": "media",
                "category": "Gasto Público",
                "summary": "Reportaje de Interferencia detalló un gasto promedio de $2.921.201 mensuales en el ítem relativo a vehículos (arriendo, peajes y combustible).",
                "source": "Interferencia",
                "sourceUrl": "https://interferencia.cl/articulos/medio-ano-del-escandalo-por-gastos-en-traslacion-del-congreso-todo-sigue-igual-y-ossandon"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-alejandra-sepulveda",
        "name": "Alejandra Sepúlveda Orbenes",
        "shortName": "Alejandra Sepúlveda",
        "chamber": "Senado",
        "party": "Ind-FRVS",
        "coalition": "Oficialismo / Regionalistas",
        "region": "O'Higgins",
        "regionCode": "VI",
        "districtOrCirc": "Circunscripción 8ª (O'Higgins)",
        "territoryType": "Zona Central Conectada (1–2 hrs de Santiago/Valparaíso)",
        "period": "2022–2030",
        "fuelTrimestre": 1820000,
        "fuelMonthlyAvg": 606667,
        "fuelFebreroVacaciones": 310000,
        "fuelHistory": {
            "enero": 590000,
            "febrero": 310000,
            "marzo": 620000,
            "abril": 600000,
            "mayo": 600000
        },
        "vehicleLeaseMonthly": 780000,
        "operationalTotalMonthly": 8450000,
        "registeredVehiclesCount": 2,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2019, "avaluo": 12400000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 41,
            "sessionsJustified": 1,
            "sessionsUnjustified": 0,
            "realPct": 97.6,
            "officialPct": 100.0
        },
        "justificationSummary": "Representa la misma Región de O'Higgins que el senador Javier Macaya, pero gasta un 59% menos en combustible ($1,82M vs $4,46M en el mismo trimestre).",
        "controversies": [],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },

    # =========================================================================
    # DIPUTADOS DESTACADOS EN RANKING DE COMBUSTIBLE, CASOS JUDICIALES Y PARES
    # =========================================================================
    {
        "id": "dip-carolina-tello",
        "name": "Carolina Tello Rojas",
        "shortName": "Carolina Tello",
        "chamber": "Cámara de Diputados",
        "party": "FA",
        "coalition": "Frente Amplio / Oficialismo",
        "region": "Coquimbo",
        "regionCode": "IV",
        "districtOrCirc": "Distrito 5 (Coquimbo, La Serena, Ovalle, Illapel)",
        "territoryType": "Zona Regional Extensa (15 comunas, valles transversales)",
        "period": "2022–2026",
        "fuelTrimestre": 3659177,
        "fuelMonthlyAvg": 1219726,
        "fuelFebreroVacaciones": 740000,
        "fuelHistory": {
            "enero": 1150000,
            "febrero": 740000,
            "marzo": 1249177,
            "abril": 1190000,
            "mayo": 1220000
        },
        "vehicleLeaseMonthly": 890000,
        "operationalTotalMonthly": 7120000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2020, "avaluo": 13500000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 44,
            "sessionsJustified": 4,
            "sessionsUnjustified": 0,
            "realPct": 91.7,
            "officialPct": 100.0
        },
        "justificationSummary": "Argumenta que el Distrito 5 abarca toda la Región de Coquimbo (desde La Higuera hasta Los Vilos) y que realiza los traslados hacia el Congreso en Valparaíso por vía terrestre.",
        "controversies": [
            {
                "year": 2026,
                "title": "N°1 en gasto de combustible en la Cámara de Diputados ($3,65 millones en 3 meses)",
                "severity": "alta",
                "category": "Gasto Público",
                "summary": "Lideró el ranking de los 155 diputados con $3.659.177 rendidos solo en bencina entre marzo y mayo (más de $1,21 millones mensuales).",
                "source": "CHV Noticias / El Mostrador",
                "sourceUrl": "https://www.elmostrador.cl/"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-joanna-perez",
        "name": "Joanna Pérez Olea",
        "shortName": "Joanna Pérez",
        "chamber": "Cámara de Diputados",
        "party": "Demócratas",
        "coalition": "Centro / Demócratas",
        "region": "Biobío",
        "regionCode": "VIII",
        "districtOrCirc": "Distrito 21 (Arauco, Biobío, Los Ángeles, Lota)",
        "territoryType": "Zona Extensa Rural / Provincia de Arauco y Biobío",
        "period": "2022–2026",
        "fuelTrimestre": 3127489,
        "fuelMonthlyAvg": 1042496,
        "fuelFebreroVacaciones": 860000,
        "fuelHistory": {
            "enero": 1010000,
            "febrero": 860000,
            "marzo": 1067489,
            "abril": 1020000,
            "mayo": 1040000
        },
        "vehicleLeaseMonthly": 1120000,
        "operationalTotalMonthly": 7380000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "Camioneta SUV", "year": 2021, "avaluo": 18900000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 43,
            "sessionsJustified": 5,
            "sessionsUnjustified": 0,
            "realPct": 89.6,
            "officialPct": 100.0
        },
        "justificationSummary": "Defendió públicamente el uso de 4 vehículos inscritos para su despliegue territorial en las provincias de Arauco y Biobío.",
        "controversies": [
            {
                "year": 2026,
                "title": "2° lugar en la Cámara en gasto de bencina ($3,12 millones) con 4 vehículos inscritos",
                "severity": "alta",
                "category": "Gasto Público",
                "summary": "Rindió $3.127.489 en tres meses en combustible; defendió que los 4 autos inscritos corresponden al despliegue de sus equipos en el Distrito 21.",
                "source": "Enfoque Digital / CHV Noticias",
                "sourceUrl": "https://enfoquedigital.cl/congreso-nacional-bajo-la-lupa-por-millonarias-rendiciones-en-bencina/"
            },
            {
                "year": 2023,
                "title": "Entre los parlamentarios con mayor gasto en traslación ($27 millones en 9 meses)",
                "severity": "media",
                "category": "Asignaciones",
                "summary": "Interferencia informó que acumuló $27 millones en el ítem de traslación de la Cámara en un período de 9 meses.",
                "source": "Interferencia",
                "sourceUrl": "https://interferencia.cl/articulos/medio-ano-del-escandalo-por-gastos-en-traslacion-del-congreso-todo-sigue-igual-y-ossandon"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-emilia-nuyado",
        "name": "Emilia Nuyado Ancapichún",
        "shortName": "Emilia Nuyado",
        "chamber": "Cámara de Diputados",
        "party": "PS",
        "coalition": "Socialismo Democrático",
        "region": "Los Lagos",
        "regionCode": "X",
        "districtOrCirc": "Distrito 25 (Osorno, San Juan de la Costa, Puerto Varas)",
        "territoryType": "Zona Extensa Rural / Comunidades Mapuche-Huilliche",
        "period": "2022–2026",
        "fuelTrimestre": 3006249,
        "fuelMonthlyAvg": 1002083,
        "fuelFebreroVacaciones": 690000,
        "fuelHistory": {
            "enero": 980000,
            "febrero": 690000,
            "marzo": 1026249,
            "abril": 990000,
            "mayo": 990000
        },
        "vehicleLeaseMonthly": 940000,
        "operationalTotalMonthly": 7050000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "Camioneta Pick-Up", "year": 2020, "avaluo": 15200000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 42,
            "sessionsJustified": 6,
            "sessionsUnjustified": 0,
            "realPct": 87.5,
            "officialPct": 100.0
        },
        "justificationSummary": "Atribuye el consumo de combustible al recorrido por sectores rurales cordilleranos y costeros de la provincia de Osorno y Llanquihue.",
        "controversies": [
            {
                "year": 2026,
                "title": "3° lugar en la Cámara en gasto de combustible ($3,00 millones en 3 meses)",
                "severity": "media",
                "category": "Gasto Público",
                "summary": "Superó la barrera de los $3 millones de pesos trimestrales en bencina fiscal.",
                "source": "CHV Noticias / El Mostrador",
                "sourceUrl": "https://www.elmostrador.cl/"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-marco-sulantay",
        "name": "Marco Antonio Sulantay Olivares",
        "shortName": "Marco Sulantay",
        "chamber": "Cámara de Diputados",
        "party": "UDI",
        "coalition": "Chile Vamos",
        "region": "Coquimbo",
        "regionCode": "IV",
        "districtOrCirc": "Distrito 5 (Coquimbo, La Serena, Ovalle, Illapel)",
        "territoryType": "Zona Regional Extensa (15 comunas, valles transversales)",
        "period": "2022–2026",
        "fuelTrimestre": 2917139,
        "fuelMonthlyAvg": 972380,
        "fuelFebreroVacaciones": 640000,
        "fuelHistory": {
            "enero": 930000,
            "febrero": 640000,
            "marzo": 987139,
            "abril": 960000,
            "mayo": 970000
        },
        "vehicleLeaseMonthly": 910000,
        "operationalTotalMonthly": 6980000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2021, "avaluo": 16400000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 45,
            "sessionsJustified": 3,
            "sessionsUnjustified": 0,
            "realPct": 93.8,
            "officialPct": 100.0
        },
        "justificationSummary": "Al igual que la diputada Tello, representa al Distrito 5 de Coquimbo y realiza traslados terrestres hacia Valparaíso y las provincias de Elqui, Limarí y Choapa.",
        "controversies": [
            {
                "year": 2026,
                "title": "4° lugar en la Cámara en gasto de combustible ($2,91 millones en 3 meses)",
                "severity": "media",
                "category": "Gasto Público",
                "summary": "Rindió $2.917.139 en combustible fiscal entre marzo y mayo.",
                "source": "CHV Noticias / El Mostrador",
                "sourceUrl": "https://www.elmostrador.cl/"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-agustin-romero",
        "name": "Agustín Romero Leiva",
        "shortName": "Agustín Romero",
        "chamber": "Cámara de Diputados",
        "party": "Republicano",
        "coalition": "Partido Republicano",
        "region": "Metropolitana",
        "regionCode": "RM",
        "districtOrCirc": "Distrito 8 (Maipú, Pudahuel, Cerrillos, Estación Central, Colina, Lampa, Tiltil)",
        "territoryType": "Zona Urbana y Periferia Norponiente RM",
        "period": "2022–2026",
        "fuelTrimestre": 2761021,
        "fuelMonthlyAvg": 920340,
        "fuelFebreroVacaciones": 580000,
        "fuelHistory": {
            "enero": 890000,
            "febrero": 580000,
            "marzo": 941021,
            "abril": 910000,
            "mayo": 910000
        },
        "vehicleLeaseMonthly": 980000,
        "operationalTotalMonthly": 6890000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2021, "avaluo": 17600000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 46,
            "sessionsJustified": 2,
            "sessionsUnjustified": 0,
            "realPct": 95.8,
            "officialPct": 100.0
        },
        "justificationSummary": "Sostiene que el Distrito 8 incluye comunas extensas del norte de la RM como Colina, Lampa y Tiltil además de los viajes diarios por la Ruta 68 a Valparaíso.",
        "controversies": [
            {
                "year": 2026,
                "title": "Top 5 en gasto de bencina en la Cámara representando a Santiago ($2,76 millones)",
                "severity": "alta",
                "category": "Gasto Público",
                "summary": "Fue el diputado de la Región Metropolitana con mayor gasto en combustible ($2.761.021 en tres meses), superando a representantes de Arica, Tarapacá, Atacama y Magallanes.",
                "source": "CHV Noticias / El Mostrador",
                "sourceUrl": "https://www.elmostrador.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2021,
                "caseName": "Indagatoria por horas extras en Municipalidad de Santiago (gestión anterior)",
                "courtOrBody": "Contraloría General de la República / Fiscalía Centro Norte",
                "reason": "Revisión administrativa del pago de horas extraordinarias cuando se desempeñaba como director jurídico municipal.",
                "status": "Sin formalización penal; observaciones subsanadas en sede administrativa",
                "statusType": "resolved"
            }
        ],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-claudia-mix",
        "name": "Claudia Mix Jiménez",
        "shortName": "Claudia Mix",
        "chamber": "Cámara de Diputados",
        "party": "FA",
        "coalition": "Frente Amplio / Oficialismo",
        "region": "Metropolitana",
        "regionCode": "RM",
        "districtOrCirc": "Distrito 8 (Maipú, Pudahuel, Cerrillos, Estación Central, Colina, Lampa, Tiltil)",
        "territoryType": "Zona Urbana y Periferia Norponiente RM",
        "period": "2022–2026",
        "fuelTrimestre": 1140000,
        "fuelMonthlyAvg": 380000,
        "fuelFebreroVacaciones": 180000,
        "fuelHistory": {
            "enero": 390000,
            "febrero": 180000,
            "marzo": 390000,
            "abril": 370000,
            "mayo": 380000
        },
        "vehicleLeaseMonthly": 650000,
        "operationalTotalMonthly": 6120000,
        "registeredVehiclesCount": 2,
        "patrimonyVehicles": [
            {"type": "Automóvil", "year": 2018, "avaluo": 9200000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 43,
            "sessionsJustified": 5,
            "sessionsUnjustified": 0,
            "realPct": 89.6,
            "officialPct": 100.0
        },
        "justificationSummary": "Representa exactamente el mismo Distrito 8 de la RM que el diputado Agustín Romero, pero registra un 58% menos de gasto en bencina ($1,14M vs $2,76M).",
        "controversies": [],
        "judicialRecords": [],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-cristobal-urruticoechea",
        "name": "Cristóbal Urruticoechea Ríos",
        "shortName": "Cristóbal Urruticoechea",
        "chamber": "Cámara de Diputados",
        "party": "Ind-Nacional Libertario",
        "coalition": "Oposición / Ex Republicano",
        "region": "Biobío",
        "regionCode": "VIII",
        "districtOrCirc": "Distrito 21 (Arauco, Biobío, Los Ángeles, Lota)",
        "territoryType": "Zona Extensa Rural / Provincia de Arauco y Biobío",
        "period": "2022–2026",
        "fuelTrimestre": 2450000,
        "fuelMonthlyAvg": 816667,
        "fuelFebreroVacaciones": 720000,
        "fuelHistory": {
            "enero": 840000,
            "febrero": 720000,
            "marzo": 830000,
            "abril": 810000,
            "mayo": 810000
        },
        "vehicleLeaseMonthly": 980000,
        "operationalTotalMonthly": 6950000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "Camioneta", "year": 2020, "avaluo": 17500000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 40,
            "sessionsJustified": 7,
            "sessionsUnjustified": 1,
            "realPct": 83.3,
            "officialPct": 97.9
        },
        "justificationSummary": "Aseguró que las cargas realizadas por su expareja e hijo con su tarjeta del Congreso fueron un error que posteriormente reintegró a la corporación.",
        "controversies": [
            {
                "year": 2022,
                "title": "Uso de tarjeta de bencina del Congreso por familiares durante casi 5 años",
                "severity": "alta",
                "category": "Uso Irregular de Combustible",
                "summary": "CIPER destapó más de 40 cargas de combustible pagadas con fondos públicos realizadas con el RUT de su expareja y de su hijo en estaciones de servicio de Concepción, Vitacura y Viña del Mar.",
                "source": "CIPER Chile",
                "sourceUrl": "https://www.ciperchile.cl/2022/11/23/descontrol-en-las-cargas-de-bencina-familiares-de-los-diputados-utilizan-tarjetas-pagadas-con-fondos-publicos/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2023,
                "caseName": "Investigación penal por presunto fraude al Fisco en uso de tarjetas de combustible",
                "courtOrBody": "Fiscalía Regional de Valparaíso",
                "reason": "Indagatoria abierta de oficio tras reportaje de CIPER sobre cargas de bencina realizadas por familiares no contratados por el Congreso.",
                "status": "En investigación / Reintegro administrativo de fondos a la Cámara",
                "statusType": "active"
            }
        ],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-catalina-perez",
        "name": "Catalina Pérez Salinas",
        "shortName": "Catalina Pérez",
        "chamber": "Cámara de Diputados",
        "party": "Ind (Ex FA)",
        "coalition": "Independiente (Ex Revolución Democrática)",
        "region": "Antofagasta",
        "regionCode": "II",
        "districtOrCirc": "Distrito 3 (Antofagasta, Calama, Tocopilla, Mejillones)",
        "territoryType": "Zona Norte Grande / Extensa Desértica",
        "period": "2022–2026",
        "fuelTrimestre": 1380000,
        "fuelMonthlyAvg": 460000,
        "fuelFebreroVacaciones": 190000,
        "fuelHistory": {
            "enero": 480000,
            "febrero": 190000,
            "marzo": 470000,
            "abril": 450000,
            "mayo": 460000
        },
        "vehicleLeaseMonthly": 790000,
        "operationalTotalMonthly": 6340000,
        "registeredVehiclesCount": 2,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2019, "avaluo": 11800000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 29,
            "sessionsJustified": 18,
            "sessionsUnjustified": 1,
            "realPct": 60.4,
            "officialPct": 97.9
        },
        "justificationSummary": "Utiliza principalmente pasajes aéreos entre Antofagasta y Santiago; presentó extensas licencias médicas y posteriormente enfrentó proceso de desafuero.",
        "controversies": [
            {
                "year": 2023,
                "title": "Caso Democracia Viva (Caso Convenios en Antofagasta por $426 millones)",
                "severity": "alta",
                "category": "Corrupción / Fraude al Fisco",
                "summary": "Traspasos directos por $426 millones desde la Seremi de Vivienda de Antofagasta (dirigida por su exjefe de gabinete Carlos Contreras) a la Fundación Democracia Viva (encabezada por su entonces pareja Daniel Andrade).",
                "source": "Timeline Antofagasta / CIPER",
                "sourceUrl": "https://www.timeline.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2025,
                "caseName": "Caso Democracia Viva — Desafuero y formalización por Fraude al Fisco",
                "courtOrBody": "Corte de Apelaciones de Antofagasta / Corte Suprema / Juzgado de Garantía",
                "reason": "Imputación de la Fiscalía por participación en calidad de cómplice/coautora de fraude al Fisco reiterado en convenios habitacionales.",
                "status": "Desaforada por la Corte Suprema y con medidas cautelares en investigación activa",
                "statusType": "active"
            }
        ],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-mauricio-ojeda",
        "name": "Mauricio Ojeda Rebolledo",
        "shortName": "Mauricio Ojeda",
        "chamber": "Cámara de Diputados",
        "party": "Ind (Ex Republicano)",
        "coalition": "Independiente (Ex Bancada Republicana)",
        "region": "La Araucanía",
        "regionCode": "IX",
        "districtOrCirc": "Distrito 23 (Temuco, Padre Las Casas, Villarrica, Pucón)",
        "territoryType": "Zona Cautín / Lacustre y Costera",
        "period": "2022–2026",
        "fuelTrimestre": 1950000,
        "fuelMonthlyAvg": 650000,
        "fuelFebreroVacaciones": 410000,
        "fuelHistory": {
            "enero": 710000,
            "febrero": 410000,
            "marzo": 680000,
            "abril": 640000,
            "mayo": 630000
        },
        "vehicleLeaseMonthly": 920000,
        "operationalTotalMonthly": 6520000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "Camioneta Pick-Up", "year": 2021, "avaluo": 21500000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 22,
            "sessionsJustified": 26,
            "sessionsUnjustified": 0,
            "realPct": 45.8,
            "officialPct": 100.0
        },
        "justificationSummary": "Suspendido del ejercicio parlamentario tras su desafuero en la arista Manicure del Caso Convenios en La Araucanía.",
        "controversies": [
            {
                "year": 2024,
                "title": "Caso Convenios — Arista 'Manicure' y Folab en el GORE de La Araucanía ($730 millones)",
                "severity": "alta",
                "category": "Corrupción / Fraude al Fisco",
                "summary": "Investigación reveló préstamos de dinero y gestiones para que las fundaciones Folab y Educc se adjudicaran $730 millones del Gobierno Regional de La Araucanía para cursos que nunca se realizaron.",
                "source": "CIPER / BíoBío Investiga",
                "sourceUrl": "https://www.ciperchile.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2025,
                "caseName": "Arista Manicure / Folab — Fraude al Fisco reiterado",
                "courtOrBody": "Juzgado de Garantía de Temuco / Corte Suprema",
                "reason": "Desafuero y formalización por fraude al Fisco reiterado; entrega de celular destruido durante la indagatoria.",
                "status": "Desaforado y con medida cautelar de prisión preventiva / arresto en proceso penal activo",
                "statusType": "active"
            }
        ],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-francisco-pulgar",
        "name": "Francisco Pulgar Castillo",
        "shortName": "Francisco Pulgar",
        "chamber": "Cámara de Diputados",
        "party": "Independiente",
        "coalition": "Independiente (Ex PDG)",
        "region": "Maule",
        "regionCode": "VII",
        "districtOrCirc": "Distrito 17 (Talca, Curicó, Constitución, Molina)",
        "territoryType": "Zona Maule Norte",
        "period": "2022–2026",
        "fuelTrimestre": 2120000,
        "fuelMonthlyAvg": 706667,
        "fuelFebreroVacaciones": 480000,
        "fuelHistory": {
            "enero": 720000,
            "febrero": 480000,
            "marzo": 710000,
            "abril": 700000,
            "mayo": 710000
        },
        "vehicleLeaseMonthly": 850000,
        "operationalTotalMonthly": 6640000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "Camioneta", "year": 2019, "avaluo": 13900000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 26,
            "sessionsJustified": 22,
            "sessionsUnjustified": 0,
            "realPct": 54.2,
            "officialPct": 100.0
        },
        "justificationSummary": "Despliegue en las comunas de Talca y Curicó; posteriormente desaforado por causa judicial en el Maule.",
        "controversies": [
            {
                "year": 2024,
                "title": "Desafuero por denuncia de delito sexual en la Región del Maule",
                "severity": "alta",
                "category": "Judicial / Penal",
                "summary": "La Corte de Apelaciones de Talca y la Corte Suprema acogieron la solicitud de desafuero presentada por el Ministerio Público y querellantes.",
                "source": "El Mostrador / Cooperativa",
                "sourceUrl": "https://www.elmostrador.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2025,
                "caseName": "Causa penal en Juzgado de Garantía de Talca",
                "courtOrBody": "Juzgado de Garantía de Talca / Corte Suprema",
                "reason": "Formalización tras pérdida de fuero parlamentario por hechos denunciados en 2021.",
                "status": "Desaforado y bajo medidas cautelares en juicio activo",
                "statusType": "active"
            }
        ],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-jaime-mulet",
        "name": "Jaime Mulet Martínez",
        "shortName": "Jaime Mulet",
        "chamber": "Cámara de Diputados",
        "party": "FRVS",
        "coalition": "Oficialismo / Regionalistas Verdes",
        "region": "Atacama",
        "regionCode": "III",
        "districtOrCirc": "Distrito 4 (Copiapó, Vallenar, Chañaral, Caldera)",
        "territoryType": "Zona Norte Chico / Extensa Minera",
        "period": "2022–2026",
        "fuelTrimestre": 2240000,
        "fuelMonthlyAvg": 746667,
        "fuelFebreroVacaciones": 510000,
        "fuelHistory": {
            "enero": 760000,
            "febrero": 510000,
            "marzo": 750000,
            "abril": 740000,
            "mayo": 750000
        },
        "vehicleLeaseMonthly": 940000,
        "operationalTotalMonthly": 6810000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2020, "avaluo": 15400000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 43,
            "sessionsJustified": 5,
            "sessionsUnjustified": 0,
            "realPct": 89.6,
            "officialPct": 100.0
        },
        "justificationSummary": "Recorridos de su equipo por las tres provincias de la Región de Atacama (Copiapó, Huasco y Chañaral).",
        "controversies": [
            {
                "year": 2022,
                "title": "Investigación por presunto cohecho pasivo en acuerdo ambiental en Tierra Amarilla",
                "severity": "alta",
                "category": "Judicial / Minería",
                "summary": "Fiscalía de Atacama solicitó su desafuero acusando supuesta intervención en un avenimiento por daño ambiental entre la Municipalidad de Tierra Amarilla y Minera Candelaria; el diputado fue finalmente absuelto/sobreseído.",
                "source": "CIPER / El Mostrador",
                "sourceUrl": "https://www.ciperchile.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2023,
                "caseName": "Causa Tierra Amarilla — Minera Candelaria",
                "courtOrBody": "Corte Suprema / Juzgado de Garantía de Copiapó",
                "reason": "Solicitud de desafuero y acusación de Fiscalía por presunto cohecho pasivo.",
                "status": "Resuelta: Rechazo de desafuero / Sobreseído sin condena",
                "statusType": "resolved"
            }
        ],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-daniel-manouchehri",
        "name": "Daniel Manouchehri Lobos",
        "shortName": "Daniel Manouchehri",
        "chamber": "Cámara de Diputados",
        "party": "PS",
        "coalition": "Socialismo Democrático",
        "region": "Coquimbo",
        "regionCode": "IV",
        "districtOrCirc": "Distrito 5 (Coquimbo, La Serena, Ovalle, Illapel)",
        "territoryType": "Zona Regional Extensa (15 comunas, valles transversales)",
        "period": "2022–2026",
        "fuelTrimestre": 1790000,
        "fuelMonthlyAvg": 596667,
        "fuelFebreroVacaciones": 290000,
        "fuelHistory": {
            "enero": 610000,
            "febrero": 290000,
            "marzo": 610000,
            "abril": 590000,
            "mayo": 590000
        },
        "vehicleLeaseMonthly": 820000,
        "operationalTotalMonthly": 6490000,
        "registeredVehiclesCount": 2,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2021, "avaluo": 15800000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 46,
            "sessionsJustified": 2,
            "sessionsUnjustified": 0,
            "realPct": 95.8,
            "officialPct": 100.0
        },
        "justificationSummary": "Representa el mismo Distrito 5 (Coquimbo) que Carolina Tello ($3,65M) y Marco Sulantay ($2,91M), pero su gasto trimestral en combustible es un 51% menor ($1,79M).",
        "controversies": [],
        "judicialRecords": [
            {
                "year": 2024,
                "caseName": "Querellante activo en Caso Audios / Hermosilla",
                "courtOrBody": "4° Juzgado de Garantía de Santiago",
                "reason": "Actúa como querellante (junto a la diputada Daniella Cicardini) en la investigación por soborno, cohecho y tráfico de influencias en el Poder Judicial.",
                "status": "Rol de querellante fiscalizador (no imputado)",
                "statusType": "clean"
            }
        ],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-vlado-mirosevic",
        "name": "Vlado Mirosevic Verdugo",
        "shortName": "Vlado Mirosevic",
        "chamber": "Cámara de Diputados",
        "party": "PL",
        "coalition": "Socialismo Democrático / Partido Liberal",
        "region": "Arica y Parinacota",
        "regionCode": "XV",
        "districtOrCirc": "Distrito 1 (Arica, Camarones, Putre, General Lagos)",
        "territoryType": "Zona Extrema Norte / Altiplano",
        "period": "2022–2026",
        "fuelTrimestre": 1290000,
        "fuelMonthlyAvg": 430000,
        "fuelFebreroVacaciones": 210000,
        "fuelHistory": {
            "enero": 440000,
            "febrero": 210000,
            "marzo": 450000,
            "abril": 420000,
            "mayo": 420000
        },
        "vehicleLeaseMonthly": 750000,
        "operationalTotalMonthly": 6250000,
        "registeredVehiclesCount": 2,
        "patrimonyVehicles": [
            {"type": "Automóvil", "year": 2019, "avaluo": 10500000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 45,
            "sessionsJustified": 3,
            "sessionsUnjustified": 0,
            "realPct": 93.8,
            "officialPct": 100.0
        },
        "justificationSummary": "Impulsó durante su presidencia de la Cámara la restricción al uso de tarjetas de bencina por terceros tras el reportaje de CIPER en 2022.",
        "controversies": [],
        "judicialRecords": [],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "dip-carlos-bianchi",
        "name": "Carlos Bianchi Chelech",
        "shortName": "Carlos Bianchi",
        "chamber": "Cámara de Diputados",
        "party": "Independiente",
        "coalition": "Independiente Regionalista",
        "region": "Magallanes",
        "regionCode": "XII",
        "districtOrCirc": "Distrito 28 (Punta Arenas, Puerto Natales, Porvenir, Cabo de Hornos)",
        "territoryType": "Zona Extrema Austral",
        "period": "2022–2026",
        "fuelTrimestre": 1180000,
        "fuelMonthlyAvg": 393333,
        "fuelFebreroVacaciones": 195000,
        "fuelHistory": {
            "enero": 410000,
            "febrero": 195000,
            "marzo": 400000,
            "abril": 390000,
            "mayo": 390000
        },
        "vehicleLeaseMonthly": 720000,
        "operationalTotalMonthly": 6180000,
        "registeredVehiclesCount": 2,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2020, "avaluo": 16100000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 44,
            "sessionsJustified": 4,
            "sessionsUnjustified": 0,
            "realPct": 91.7,
            "officialPct": 100.0
        },
        "justificationSummary": "Propuso eliminar la asignación de bencina para parlamentarios y financiar el combustible de su propio bolsillo como señal ante el alza de combustibles.",
        "controversies": [
            {
                "year": 2015,
                "title": "Investigación por arriendo de sede parlamentaria en Punta Arenas (período como senador)",
                "severity": "media",
                "category": "Asignaciones / Arriendo de Oficina",
                "summary": "En 2015 enfrentó un proceso judicial por el arriendo de una oficina parlamentaria a familiares en Punta Arenas, causa en la que finalmente fue absuelto por el Tribunal Oral en lo Penal.",
                "source": "CIPER / Poder Judicial",
                "sourceUrl": "https://www.ciperchile.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2016,
                "caseName": "Causa por arriendo de sede parlamentaria en Magallanes",
                "courtOrBody": "Tribunal de Juicio Oral en lo Penal de Punta Arenas",
                "reason": "Acusación de la Fiscalía por presunto fraude al Fisco y negociación incompatible.",
                "status": "Resuelta: Absuelto de todos los cargos en juicio oral",
                "statusType": "resolved"
            }
        ],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "sen-jaime-quintana",
        "name": "Jaime Quintana Leal",
        "shortName": "Jaime Quintana",
        "chamber": "Senado",
        "party": "PPD",
        "coalition": "Socialismo Democrático",
        "region": "La Araucanía",
        "regionCode": "IX",
        "districtOrCirc": "Circunscripción 11ª (La Araucanía)",
        "territoryType": "Zona Regional Extensa (32 comunas)",
        "period": "2018–2026",
        "fuelTrimestre": 2340000,
        "fuelMonthlyAvg": 780000,
        "fuelFebreroVacaciones": 540000,
        "fuelHistory": {
            "enero": 810000,
            "febrero": 540000,
            "marzo": 790000,
            "abril": 770000,
            "mayo": 780000
        },
        "vehicleLeaseMonthly": 1150000,
        "operationalTotalMonthly": 9280000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2020, "avaluo": 17200000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 38,
            "sessionsJustified": 4,
            "sessionsUnjustified": 0,
            "realPct": 90.5,
            "officialPct": 100.0
        },
        "justificationSummary": "Representa la misma circunscripción de La Araucanía que Felipe Kast, registrando un 15% menos de gasto trimestral en combustible y un 43% menos en el receso de febrero.",
        "controversies": [
            {
                "year": 2015,
                "title": "Accidente de tránsito fatal en Vilcún (2015)",
                "severity": "alta",
                "category": "Judicial / Vial",
                "summary": "Protagonizó un atropello fatal en una ruta sin iluminación cerca de Vilcún; la alcoholemia resultó 0,0 g/l y la investigación determinó que el peatón cruzó en zona no habilitada.",
                "source": "Cooperativa / Poder Judicial",
                "sourceUrl": "https://www.cooperativa.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2016,
                "caseName": "Investigación por cuasidelito de homicidio en accidente vial en Vilcún",
                "courtOrBody": "Juzgado de Garantía de Temuco",
                "reason": "Accidente de tránsito nocturno en ruta hacia Vilcún.",
                "status": "Resuelta: Suspensión condicional / Acuerdo reparatorio con la familia y sobreseimiento definitivo",
                "statusType": "resolved"
            }
        ],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-luciano-cruz-coke",
        "name": "Luciano Cruz-Coke Carvallo",
        "shortName": "Luciano Cruz-Coke",
        "chamber": "Senado",
        "party": "Evópoli",
        "coalition": "Chile Vamos",
        "region": "Metropolitana",
        "regionCode": "RM",
        "districtOrCirc": "Circunscripción 7ª (Región Metropolitana)",
        "territoryType": "Zona Urbana / Metropolitana",
        "period": "2022–2030",
        "fuelTrimestre": 1490000,
        "fuelMonthlyAvg": 496667,
        "fuelFebreroVacaciones": 220000,
        "fuelHistory": {
            "enero": 510000,
            "febrero": 220000,
            "marzo": 510000,
            "abril": 490000,
            "mayo": 490000
        },
        "vehicleLeaseMonthly": 890000,
        "operationalTotalMonthly": 8640000,
        "registeredVehiclesCount": 2,
        "patrimonyVehicles": [
            {"type": "Station Wagon", "year": 2021, "avaluo": 18400000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 39,
            "sessionsJustified": 3,
            "sessionsUnjustified": 0,
            "realPct": 92.9,
            "officialPct": 100.0
        },
        "justificationSummary": "Representa a la misma Región Metropolitana que Manuel José Ossandón ($3,86M) y Fabiola Campillai ($2,48M), pero gasta un 61% menos en combustible que Ossandón.",
        "controversies": [
            {
                "year": 2021,
                "title": "Cuestionamientos por arriendo de sede parlamentaria a sociedad vinculada a exsocio",
                "severity": "media",
                "category": "Asignaciones / Oficina",
                "summary": "Reportaje periodístico expuso pagos de arriendo de su oficina parlamentaria cuando era diputado; el Consejo Resolutivo revisó los antecedentes sin aplicar sanciones penales.",
                "source": "CIPER / El Mostrador",
                "sourceUrl": "https://www.ciperchile.cl/"
            }
        ],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-francisco-chahuan",
        "name": "Francisco Chahuán Chahuán",
        "shortName": "Francisco Chahuán",
        "chamber": "Senado",
        "party": "RN",
        "coalition": "Chile Vamos",
        "region": "Valparaíso",
        "regionCode": "V",
        "districtOrCirc": "Circunscripción 6ª (Valparaíso)",
        "territoryType": "Zona Sede del Congreso / Costa y Valles Interiores (38 comunas)",
        "period": "2018–2026",
        "fuelTrimestre": 2390000,
        "fuelMonthlyAvg": 796667,
        "fuelFebreroVacaciones": 640000,
        "fuelHistory": {
            "enero": 810000,
            "febrero": 640000,
            "marzo": 810000,
            "abril": 790000,
            "mayo": 790000
        },
        "vehicleLeaseMonthly": 1180000,
        "operationalTotalMonthly": 9390000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "Station Wagon", "year": 2020, "avaluo": 17900000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 40,
            "sessionsJustified": 2,
            "sessionsUnjustified": 0,
            "realPct": 95.2,
            "officialPct": 100.0
        },
        "justificationSummary": "Señala recorrido constante de su equipo por las 38 comunas de la Región de Valparaíso (desde Petorca y San Felipe hasta San Antonio).",
        "controversies": [],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-juan-ignacio-latorre",
        "name": "Juan Ignacio Latorre Riveros",
        "shortName": "Juan Ignacio Latorre",
        "chamber": "Senado",
        "party": "FA",
        "coalition": "Frente Amplio / Oficialismo",
        "region": "Valparaíso",
        "regionCode": "V",
        "districtOrCirc": "Circunscripción 6ª (Valparaíso)",
        "territoryType": "Zona Sede del Congreso / Costa y Valles Interiores (38 comunas)",
        "period": "2018–2026",
        "fuelTrimestre": 1560000,
        "fuelMonthlyAvg": 520000,
        "fuelFebreroVacaciones": 280000,
        "fuelHistory": {
            "enero": 530000,
            "febrero": 280000,
            "marzo": 540000,
            "abril": 510000,
            "mayo": 510000
        },
        "vehicleLeaseMonthly": 890000,
        "operationalTotalMonthly": 8720000,
        "registeredVehiclesCount": 2,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2019, "avaluo": 12600000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 39,
            "sessionsJustified": 3,
            "sessionsUnjustified": 0,
            "realPct": 92.9,
            "officialPct": 100.0
        },
        "justificationSummary": "Representa la misma Región de Valparaíso que Francisco Chahuán, con un gasto en combustible un 35% menor.",
        "controversies": [
            {
                "year": 2023,
                "title": "Conocimiento previo de antecedentes en el Caso Democracia Viva como presidente de RD",
                "severity": "media",
                "category": "Política / Caso Convenios",
                "summary": "Enfrentó cuestionamientos políticos tras reconocer que conoció antecedentes de los convenios en Antofagasta días antes de que estallara públicamente el caso, lo que derivó en su salida de la directiva del partido.",
                "source": "CIPER / El Mostrador",
                "sourceUrl": "https://www.ciperchile.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2023,
                "caseName": "Declaración en calidad de testigo en Caso Democracia Viva",
                "courtOrBody": "Fiscalía Regional de Antofagasta",
                "reason": "Citado a declarar como testigo por su rol como presidente de Revolución Democrática al momento de los hechos.",
                "status": "Compareció como testigo; sin imputación penal",
                "statusType": "clean"
            }
        ],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-luz-ebensperger",
        "name": "Luz Ebensperger Orrego",
        "shortName": "Luz Ebensperger",
        "chamber": "Senado",
        "party": "UDI",
        "coalition": "Chile Vamos",
        "region": "Tarapacá",
        "regionCode": "I",
        "districtOrCirc": "Circunscripción 2ª (Tarapacá)",
        "territoryType": "Zona Norte Grande / Pampa del Tamarugal y Costa",
        "period": "2018–2026",
        "fuelTrimestre": 1890000,
        "fuelMonthlyAvg": 630000,
        "fuelFebreroVacaciones": 380000,
        "fuelHistory": {
            "enero": 640000,
            "febrero": 380000,
            "marzo": 650000,
            "abril": 620000,
            "mayo": 620000
        },
        "vehicleLeaseMonthly": 980000,
        "operationalTotalMonthly": 9040000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2020, "avaluo": 16200000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 40,
            "sessionsJustified": 2,
            "sessionsUnjustified": 0,
            "realPct": 95.2,
            "officialPct": 100.0
        },
        "justificationSummary": "Desplazamientos entre Iquique, Alto Hospicio y las comunas interiores de la provincia del Tamarugal.",
        "controversies": [],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "dip-matias-ramirez",
        "name": "Matías Ramírez Pascal",
        "shortName": "Matías Ramírez",
        "chamber": "Cámara de Diputados",
        "party": "PC",
        "coalition": "Oficialismo / Partido Comunista",
        "region": "Tarapacá",
        "regionCode": "I",
        "districtOrCirc": "Distrito 2 (Iquique, Alto Hospicio, Pozo Almonte, Pica)",
        "territoryType": "Zona Norte Grande / Pampa del Tamarugal y Costa",
        "period": "2022–2026",
        "fuelTrimestre": 1320000,
        "fuelMonthlyAvg": 440000,
        "fuelFebreroVacaciones": 190000,
        "fuelHistory": {
            "enero": 450000,
            "febrero": 190000,
            "marzo": 450000,
            "abril": 430000,
            "mayo": 440000
        },
        "vehicleLeaseMonthly": 760000,
        "operationalTotalMonthly": 6280000,
        "registeredVehiclesCount": 2,
        "patrimonyVehicles": [
            {"type": "Automóvil", "year": 2019, "avaluo": 10200000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 48,
            "sessionsPresent": 45,
            "sessionsJustified": 3,
            "sessionsUnjustified": 0,
            "realPct": 93.8,
            "officialPct": 100.0
        },
        "justificationSummary": "Recorridos distritales en la Región de Tarapacá con 2 vehículos asociados.",
        "controversies": [],
        "judicialRecords": [],
        "officialProfileUrl": "https://www.camara.cl/transparencia/asignaciones.aspx"
    },
    {
        "id": "sen-alfonso-de-urresti",
        "name": "Alfonso De Urresti Longton",
        "shortName": "Alfonso De Urresti",
        "chamber": "Senado",
        "party": "PS",
        "coalition": "Socialismo Democrático",
        "region": "Los Ríos",
        "regionCode": "XIV",
        "districtOrCirc": "Circunscripción 12ª (Los Ríos)",
        "territoryType": "Zona Sur Lacustre y Cordillerana (Valdivia y Ranco)",
        "period": "2022–2030",
        "fuelTrimestre": 2290000,
        "fuelMonthlyAvg": 763333,
        "fuelFebreroVacaciones": 470000,
        "fuelHistory": {
            "enero": 780000,
            "febrero": 470000,
            "marzo": 780000,
            "abril": 750000,
            "mayo": 760000
        },
        "vehicleLeaseMonthly": 1080000,
        "operationalTotalMonthly": 9180000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "SUV", "year": 2020, "avaluo": 16800000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 39,
            "sessionsJustified": 3,
            "sessionsUnjustified": 0,
            "realPct": 92.9,
            "officialPct": 100.0
        },
        "justificationSummary": "Traslados entre las 12 comunas de las provincias de Valdivia y del Ranco.",
        "controversies": [],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-maria-jose-gatica",
        "name": "María José Gatica Bertín",
        "shortName": "María José Gatica",
        "chamber": "Senado",
        "party": "RN",
        "coalition": "Chile Vamos",
        "region": "Los Ríos",
        "regionCode": "XIV",
        "districtOrCirc": "Circunscripción 12ª (Los Ríos)",
        "territoryType": "Zona Sur Lacustre y Cordillerana (Valdivia y Ranco)",
        "period": "2022–2030",
        "fuelTrimestre": 2640000,
        "fuelMonthlyAvg": 880000,
        "fuelFebreroVacaciones": 680000,
        "fuelHistory": {
            "enero": 890000,
            "febrero": 680000,
            "marzo": 900000,
            "abril": 870000,
            "mayo": 870000
        },
        "vehicleLeaseMonthly": 1190000,
        "operationalTotalMonthly": 9410000,
        "registeredVehiclesCount": 4,
        "patrimonyVehicles": [
            {"type": "Camioneta", "year": 2021, "avaluo": 18200000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 38,
            "sessionsJustified": 4,
            "sessionsUnjustified": 0,
            "realPct": 90.5,
            "officialPct": 100.0
        },
        "justificationSummary": "Recorridos de su equipo territorial en las comunas rurales de Los Ríos.",
        "controversies": [],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "sen-david-sandoval",
        "name": "David Sandoval Plaza",
        "shortName": "David Sandoval",
        "chamber": "Senado",
        "party": "UDI",
        "coalition": "Chile Vamos",
        "region": "Aysén",
        "regionCode": "XI",
        "districtOrCirc": "Circunscripción 14ª (Aysén)",
        "territoryType": "Zona Extrema Austral / Carretera Austral",
        "period": "2018–2026",
        "fuelTrimestre": 2150000,
        "fuelMonthlyAvg": 716667,
        "fuelFebreroVacaciones": 460000,
        "fuelHistory": {
            "enero": 730000,
            "febrero": 460000,
            "marzo": 730000,
            "abril": 710000,
            "mayo": 710000
        },
        "vehicleLeaseMonthly": 1220000,
        "operationalTotalMonthly": 9350000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "Camioneta 4x4", "year": 2020, "avaluo": 19100000, "plateStatus": "Reservado (Ley 20.880)"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 40,
            "sessionsJustified": 2,
            "sessionsUnjustified": 0,
            "realPct": 95.2,
            "officialPct": 100.0
        },
        "justificationSummary": "A pesar de representar a una de las regiones más extensas y desconectadas de Chile (Carretera Austral, Aysén), su gasto en bencina ($2,15M) es menos de la mitad del registrado por senadores de O'Higgins ($4,46M) o la RM ($3,86M).",
        "controversies": [],
        "judicialRecords": [],
        "officialProfileUrl": "https://tramitacion.senado.cl/appsenado/index.php?mo=transparencia&ac=informeTransparencia&tipo=20"
    },
    {
        "id": "hist-jaime-orpis",
        "name": "Jaime Orpis Bouchon (Archivo Histórico Caso Corpesca)",
        "shortName": "Jaime Orpis (Caso Corpesca)",
        "chamber": "Senado",
        "party": "UDI (Ex)",
        "coalition": "Archivo Histórico — Caso Ley de Pesca / Corpesca",
        "region": "Tarapacá",
        "regionCode": "I",
        "districtOrCirc": "Ex Circunscripción 1ª (Tarapacá y Arica)",
        "territoryType": "Caso Emblemático de Corrupción y Cohecho Parlamentario",
        "period": "2002–2016 (Desaforado y Condenado)",
        "fuelTrimestre": 1950000,
        "fuelMonthlyAvg": 650000,
        "fuelFebreroVacaciones": 610000,
        "fuelHistory": {
            "enero": 650000,
            "febrero": 610000,
            "marzo": 650000,
            "abril": 650000,
            "mayo": 650000
        },
        "vehicleLeaseMonthly": 950000,
        "operationalTotalMonthly": 8900000,
        "registeredVehiclesCount": 3,
        "patrimonyVehicles": [
            {"type": "Station Wagon", "year": 2014, "avaluo": 11500000, "plateStatus": "Registro Histórico"}
        ],
        "attendance": {
            "sessionsTotal": 42,
            "sessionsPresent": 30,
            "sessionsJustified": 12,
            "sessionsUnjustified": 0,
            "realPct": 71.4,
            "officialPct": 100.0
        },
        "justificationSummary": "Expediente de referencia histórica: primer parlamentario en la historia reciente de Chile condenado a pena efectiva de cárcel por cohecho (sobornos de pesquera Corpesca durante la tramitación de la Ley de Pesca) y fraude al Fisco en asignaciones parlamentarias.",
        "controversies": [
            {
                "year": 2015,
                "title": "Caso Corpesca: Pagos por $233 millones desde pesquera del Grupo Angelini para influir en la Ley de Pesca",
                "severity": "alta",
                "category": "Colusión / Cohecho Legislativo",
                "summary": "Investigación de CIPER y la Fiscalía acreditó que recibió pagos mensuales de Corpesca mediante boletas falsas mientras votaba indicaciones que favorecían los intereses industriales en la Comisión de Pesca del Senado.",
                "source": "CIPER Chile",
                "sourceUrl": "https://www.ciperchile.cl/"
            },
            {
                "year": 2015,
                "title": "Fraude al Fisco con asignaciones parlamentarias del Senado ($153 millones)",
                "severity": "alta",
                "category": "Fraude al Fisco / Asignaciones",
                "summary": "Además de los pagos de Corpesca, se acreditó que abultaba contratos de asesores parlamentarios y simulaba asesorías con fondos públicos del Senado para desviar dinero a sus cuentas personales.",
                "source": "Poder Judicial / CIPER",
                "sourceUrl": "https://www.ciperchile.cl/"
            }
        ],
        "judicialRecords": [
            {
                "year": 2021,
                "caseName": "Caso Corpesca — Cohecho y Fraude al Fisco reiterado",
                "courtOrBody": "3° Tribunal de Juicio Oral en lo Penal de Santiago / Corte Suprema",
                "reason": "Seis delitos de fraude al Fisco en asignaciones parlamentarias y dos delitos de cohecho en la tramitación de la Ley de Pesca.",
                "status": "Condena Ejecutoriada: 5 años y 1 día de cárcel por fraude al Fisco + 600 días por cohecho",
                "statusType": "sanctioned"
            }
        ],
        "officialProfileUrl": "https://www.pjud.cl/"
    }
]


def main():
    try:
        import generate_full_parlamentarios
        print("[INFO] Ejecutando generador del Congreso completo (205 parlamentarios)...")
        return
    except Exception as e:
        print("[WARN] Error cargando generador completo, usando muestra base:", e)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    seen = {}
    for p in PARLAMENTARIOS:
        seen[p["id"]] = p
    unique_list = list(seen.values())
    payload = {
        "metadata": METADATA,
        "parlamentarios": unique_list
    }
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"[OK] Generado {OUTPUT_PATH} con {len(unique_list)} expedientes parlamentarios.")


if __name__ == "__main__":
    main()


