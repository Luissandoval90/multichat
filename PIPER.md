# Claude — español de México

MultiChat incluye la voz local `es_MX-claude-high` (22.050 Hz), sin cuentas ni servicios externos. En Voz, selecciona «Claude · Español de México · Piper» y pulsa Probar. La lectura respeta los interruptores por plataforma, volumen, velocidad y la opción de leer el nombre. La cola es limitada para evitar minutos de retraso en chats ocupados. Al desactivar la lectura o cambiar de voz, se descarta la cola y se cancela el audio.

Para preparar el proyecto en Windows x64: `npm run prepare:piper`. Esta descarga de compilación verifica SHA-256 del motor, modelo y configuración; la aplicación distribuida funciona sin internet. No requiere instalar Python. Compilar: `npm run dist -- --publish never`.

Componentes distribuidos sin modificar, junto con sus licencias en resources/piper:

- Piper 2023.11.14-2, licencia MIT. Código fuente y binarios: https://github.com/rhasspy/piper/tree/2023.11.14-2 y https://github.com/rhasspy/piper/releases/tag/2023.11.14-2.
- Piper Phonemize y bibliotecas del paquete original: https://github.com/rhasspy/piper-phonemize.
- eSpeak NG, GPL v3 o posterior: https://github.com/espeak-ng/espeak-ng. Fuentes y compilación usadas por el paquete: https://github.com/rhasspy/piper-phonemize/blob/master/CMakeLists.txt.
- ONNX Runtime, licencia MIT: https://github.com/microsoft/onnxruntime.
- Voz Claude: https://huggingface.co/rhasspy/piper-voices/tree/e7229f7d33a10e145e109b886d661984201ac3c4/es/es_MX/claude/high. Su ficha declara el conjunto de datos bajo Apache 2.0, de https://huggingface.co/spaces/HirCoir/Piper-TTS-Spanish. Se incluyen la ficha original y la licencia Apache 2.0.

Los archivos binarios y modelos se guardan en vendor/piper (excluido de Git) y se copian fuera de app.asar al compilar. El script de preparación y las pruebas forman parte del proyecto.
