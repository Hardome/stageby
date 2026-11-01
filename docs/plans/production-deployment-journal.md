# Журнал подготовки production

<!-- cspell:ignore hdrcharset MOUNTPOINTS publickey FSTYPE lntup chrony -->
<!-- cspell:ignore dpkg getent permitrootlogin passwordauthentication pubkeyauthentication onlink keyrings buildx hardo pscustomobject noout mktemp dbname dumpall cpus -->
<!-- cspell:ignore сверён просмотрщика резолвер автозапуска перегенерировать -->

План: `docs/plans/production-deployment.md`.
Сервер: `82.202.131.126`; пользователь администрирования и деплоя: `root`.
Серверные команды выполняет пользователь по SSH; результаты фиксируются после
получения вывода. Пароли, ключи, cookies и подписанные URL сюда не записывать.
Записывать сюда серверные команды для выполнения по SSH, их статус и полученный
результат. До получения вывода отмечать проверку как ожидающую подтверждения.
Локальные сборки и проверки фиксировать в плане, не в этом журнале.

## 31.10.2026 — локальная сборка

- `pnpm run release build` из чистого `d6e696b`, объединённого PR #78:
  происхождение подтверждено; Linux-проверка остановилась на cspell.
  Системный tar Windows исказил кириллическое имя файла ТЗ.
- Лог: `docs/tmp/release-build-20261031.log`. Комплект релиза не создан;
  smoke и измерение архива не выполнены. Временный Compose удалён сценарием.
- Ветка исправления: `fix/release-archive-utf8`. Для Windows добавлено
  `--options hdrcharset=UTF-8`; тестовый Git-снимок содержит кириллическое имя
  с пробелами и проверяет сохранность содержимого.
- `pnpm run release:test`: 28/28 в Windows и 28/28 в Linux-контейнере.
- Полный релиз повторить после объединения исправления через PR с ревью.

## 31.10.2026 — подключение

Попытка автоматического входа:

```powershell
ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=yes root@82.202.131.126 "uname -m; cat /etc/os-release; df -B1 /; lsblk -b -o NAME,SIZE,TYPE,MOUNTPOINTS"
```

Получен отказ `Permission denied (publickey,password)`. Пользователь подтвердил
вход по паролю и выбрал самостоятельное выполнение присылаемых команд.

## 31.10.2026 — блок 1: первичная диагностика

Статус: выполнено пользователем; вывод получен.

```bash
printf '\n== OS ==\n'
cat /etc/os-release
uname -m
printf '\n== Resources ==\n'
nproc
free -h
df -hT /
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
printf '\n== Services and ports ==\n'
systemctl is-active docker ssh ufw
ss -lntup
printf '\n== Firewall ==\n'
ufw status verbose
```

Результаты:

| Проверка | Результат |
| --- | --- |
| ОС и архитектура | Ubuntu 26.04.1 LTS, x86_64 |
| CPU | 2 |
| RAM | 3,8 ГиБ, доступно 3,3 ГиБ |
| Swap | Отсутствует |
| Корневой раздел | ext4, 38 ГиБ; занято 2,7 ГиБ; доступно 35 ГиБ |
| Диск | vda 40 ГиБ, отдельные /boot и /boot/efi |
| Docker | Служба не активна; наличие пакетов не проверено |
| SSH | Активен, TCP 22 на IPv4 и IPv6 |
| Остальные слушатели | DNS и chrony только на loopback |
| UFW | Служба активна; фильтрация выключена |

Команды не меняли сервер. Первичная диагностика не закрывает этап 2:
запас диска проверяется после измерения релиза и загрузки образов.

Следующие действия на момент диагностики: объединить исправление через PR,
собрать комплект и рассчитать бюджет диска. Результат сборки записан ниже.

## 31.10.2026 — первый полный комплект релиза

Из чистого `1f8763d7c8844d6b5631591799bc0212cfe66696`, итогового коммита PR #79,
выполнен `pnpm run release build`.

- Комплект: `docs/tmp/releases/20261031T131317903Z-1f8763d7c884-0c6dc4/`.
- Лог: `docs/tmp/release-build-20261031-pr79.log`.
- Linux-проверки прошли: генерация, линтеры, типы, 293 API-теста, 510 web-тестов
  и сборки. Кириллическое имя файла сохранилось, cspell прошёл.
- Образы API, мигратора, Web/Caddy и PostgreSQL собраны для `linux/amd64`.
  Smoke прошёл; временные check- и smoke-стенды удалены сценарием.
- Manifest содержит происхождение PR #79, Git SHA, версии инструментов,
  ID образов и результаты `linux: passed`, `smoke: passed`.
- Независимо сверены все 8 записей `SHA256SUMS`, включая manifest и архив.

PowerShell вернул код 1 для оболочки с перенаправлением `*>`: в начале лога
есть `NativeCommandError` на обычную строку pnpm, записанную в stderr.
Сам сценарий дошёл до финального `Release … built at …`; успешность подтверждена
завершённым комплектом, manifest, строкой `Production smoke checks passed`
и независимой сверкой SHA-256. Код 0 оболочки этим запуском не подтверждён.

### Измерения и предварительный бюджет диска

| Величина | Байты | Приблизительно |
| --- | ---: | ---: |
| Весь комплект | 275 008 114 | 262,3 МиБ |
| `images.tar.gz` | 274 998 275 | 262,3 МиБ |
| Архив до внешнего gzip | 277 382 656 | 264,5 МиБ |
| Сумма размеров четырёх образов из Docker inspect | 366 378 157 | 349,4 МиБ |
| Сумма распакованных tar-слоёв внутри архива, 34 слоя | 824 807 936 | 786,6 МиБ |

Размеры Docker inspect и архива не равны месту, занятому на файловой системе
VPS. Слои посчитаны после распаковки вложенных gzip; это оценка содержимого,
без метаданных файловой системы и Docker.

Для исходных 35 ГиБ доступного места предлагается следующий бюджет. Он служит
для планирования: разделы, квоты и файлы резерва на VPS не создавались.

| Назначение | Бюджет, ГиБ |
| --- | ---: |
| Три сохранённых релиза и приём следующего | 6 |
| Данные PostgreSQL без WAL | 8 |
| WAL | 4 |
| Логи и временные рабочие файлы | 1 |
| Возможный swap | 2 |
| Дополнительные пакеты ОС и Docker | 4 |
| Свободное место для аварийных операций | 8 |
| Всего | 33 |

Оценка релизов учитывает четыре комплекта одновременно и для каждого складывает
архив, размер образов из inspect и распакованные слои без скидки на общие слои:
`4 × (275 008 114 + 366 378 157 + 824 807 936)` ≈ 5,46 ГиБ.
Бюджет 6 ГиБ округлён вверх; после установки сверить его с фактическим расходом.
Из исходных 35 ГиБ около 2 ГиБ остаются сверх указанного бюджета.

Бюджеты БД и WAL не являются установленными лимитами. Объём данных пока нулевой;
при росте БД или задержке архивирования WAL расчёт пересмотреть. Образ с pgBackRest
ещё не подготовлен; после его добавления размеры измерить повторно.

Этап 2 завершён. Перед настройкой этапа 3 пользователь выполняет по SSH следующий
блок диагностики и присылает вывод. Он читает настройки и не меняет сервер.

```bash
command -v docker || true
command -v ansible || true
dpkg-query -W -f='${Package} ${Version}\n' docker-ce docker-ce-cli docker.io containerd.io docker-compose-plugin unattended-upgrades 2>/dev/null || true
systemctl is-enabled docker containerd unattended-upgrades 2>/dev/null || true
getent group sudo
ip -brief address
ip route
ip -6 route
sshd -T | awk '$1 ~ /^(permitrootlogin|passwordauthentication|pubkeyauthentication|port)$/ { print }'
test ! -f /root/.ssh/authorized_keys || awk 'NF && $1 !~ /^#/ { count++ } END { print "Root authorized key entries:", count+0 }' /root/.ssh/authorized_keys
```

После получения вывода подготовить Ansible с учётом установленных пакетов,
сетей и согласованного способа доступа по SSH.

## 31.10.2026 — блок 2: пакеты, сеть и SSH

Статус: пользователь прислал вывод диагностики.

| Проверка | Результат |
| --- | --- |
| Docker и Ansible | `command -v` не вывел пути; пакеты Docker в выводе не обнаружены |
| Службы Docker и containerd | `not-found` |
| Автоматические обновления | `unattended-upgrades 2.12ubuntu9`, служба enabled; политика перезагрузки ещё не проверена |
| Группа sudo | `sudo:x:27:`, дополнительных участников нет |
| IPv4 | `eth0`, `82.202.131.126/32`; default via `100.100.1.1`, onlink |
| IPv6 | Только loopback и link-local; глобального адреса и default route в выводе нет |
| SSH | Порт 22; `PermitRootLogin yes`, `PubkeyAuthentication yes`, `PasswordAuthentication yes` |
| Ключи root | Одна непустая запись в `authorized_keys`; владелец ключа и вход по нему не подтверждены |

В присланном тексте команды потеряли часть кавычек, перенаправлений и операторов.
Фиксируются полученные значения; точное выполнение исходного блока не подтверждено.
Настройки сервера этим блоком не менялись.

Предложенный переход на SSH-ключи отменён пользователем. Дальнейшая подготовка
использует парольную аутентификацию, как описано ниже.

## 31.10.2026 — согласованный доступ по паролю

Пользователь выбрал SSH и SCP с интерактивным вводом пароля. Обязательные
SSH-ключи и отключение парольного входа исключены из плана. Текущий доступ root
сохраняется. Впоследствии пользователь также исключил создание отдельных
пользователей ОС: администрирование и деплой выполняются от root.
Пароли не сохранять в Git, командах, конфигурации релиза и логах.

Следующий блок устанавливает Docker Engine и Compose из официального APT-репозитория,
включает автозапуск Docker и проверяет запуск контейнера. Статус: выполнен
пользователем, вывод проверок получен. Инструкция сверена с
[Docker Docs](https://docs.docker.com/engine/install/ubuntu/), где Ubuntu 26.04 LTS
указана среди поддерживаемых систем.

Команды выполнить в текущей SSH-сессии root. `bash` ограничивает действие
`set -eu` этим блоком: при ошибке установка остановится, SSH-сессия сохранится.

```bash
bash <<'STAGEBY_DOCKER'
set -eu
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker version
docker compose version
docker run --rm hello-world
systemctl is-enabled docker
df -hT /
STAGEBY_DOCKER
```

После получения вывода зафиксировать версии и свободное место. Затем настроить
каталоги, firewall и обновления без автоматической перезагрузки. Команды первичной
настройки перенести в Ansible для воспроизводимой подготовки следующего VPS.

## 31.10.2026 — блок 3: Docker установлен

| Проверка | Результат |
| --- | --- |
| Docker client/server | 29.9.2, API 1.56, linux/amd64 |
| containerd / runc | 2.4.2 / 1.5.2 |
| Compose | 5.6.1 |
| Запуск контейнера | `docker run --rm hello-world` завершился с приветствием |
| Автозапуск Docker | `systemctl is-enabled docker`: enabled |
| Корневой раздел | ext4, 38 ГиБ; занято 3,2 ГиБ, доступно 35 ГиБ |

Проверка запуска Docker после перезагрузки ещё не выполнена. Образы Stageby пока
не загружены; фактический расход диска после загрузки остаётся открытым пунктом.

### Блок 4: каталоги и firewall

Статус: выполнен пользователем по SSH от root; получен вывод UFW и каталогов.
UFW активен и включён при загрузке; разрешены TCP 22/80/443 и UDP 443
для IPv4/IPv6. Политики: deny incoming, allow outgoing, deny routed.
Подтверждены root:root и права 0700 для `/etc/stageby`, 0750 для `/opt/stageby`,
`incoming` и `releases`. Строка `state` в присланном выводе обрезана;
права проверить следующим блоком. Новое SSH-подключение пока не подтверждено.

Каталоги релизов, входящих комплектов и состояния находятся в `/opt/stageby/`;
секреты — отдельно в `/etc/stageby/`. Каталоги принадлежат root, который выполняет
администрирование и деплой; отдельный пользователь деплоя не создаётся.

Разрешить TCP 22, 80, 443 и UDP 443; остальные входящие соединения хоста запретить.
SSH на TCP 22 доступен с любых адресов согласно текущему способу подключения.
Правила применяются к IPv4 и IPv6, хотя глобального IPv6 на сервере пока нет.
Порядок команд сверён с
[инструкцией Ubuntu](https://ubuntu.com/server/docs/how-to/security/firewalls/).

```bash
bash <<'STAGEBY_FIREWALL'
set -eu
install -d -o root -g root -m 0750 /opt/stageby
install -d -o root -g root -m 0750 /opt/stageby/releases /opt/stageby/incoming /opt/stageby/state
install -d -o root -g root -m 0700 /etc/stageby
sed -i 's/^IPV6=.*/IPV6=yes/' /etc/default/ufw
grep -qx 'IPV6=yes' /etc/default/ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw default deny incoming
ufw default allow outgoing
ufw --force enable
ufw status verbose
ls -ld /opt/stageby /opt/stageby/releases /opt/stageby/incoming /opt/stageby/state /etc/stageby
STAGEBY_FIREWALL
```

После выполнения сохранить текущую сессию и проверить новое подключение
`ssh root@82.202.131.126` из отдельного окна Windows. Записать результат
нового подключения вместе с выводом `ufw status verbose` и правами каталогов.

UFW фильтрует входящие соединения хоста; опубликованные Docker-порты могут
обходить его правила, как описано в
[Docker Docs](https://docs.docker.com/engine/network/packet-filtering-firewalls/).
В Compose Stageby опубликованы только 80/443 Caddy; API и БД портов хоста не имеют.
Общий пункт firewall в плане закрыть после проверки публикаций и внешнего доступа
на запущенном стенде. Правила Docker этим блоком не изменяются.

### Блок 5: обновления безопасности без автоматической перезагрузки

Статус: получен частичный вывод после выполнения пользователем. Оба APT-таймера
присутствуют: следующий запуск `apt-daily.timer` — 31.10.2026 18:22:11 UTC,
`apt-daily-upgrade.timer` — 01.11.2026 06:00:15 UTC. Вывод эффективной конфигурации
APT и прав `state` не получен; успешный вход в новую SSH-сессию явно не подтверждён.
Сначала открыть новую SSH-сессию `ssh root@82.202.131.126`; блок выполнить в ней.
Пакет unattended-upgrades уже установлен. Настройка разрешает стандартные
Ubuntu-источники безопасности и ESM, исключает сторонние репозитории и задаёт
ежедневные проверки. Docker обновляется отдельно в окно обслуживания.
Параметры сверены с
[инструкцией Ubuntu](https://ubuntu.com/server/docs/how-to/software/automatic-updates/).

В предыдущем выводе `set -eu` оказался в основной интерактивной оболочке.
Первая строка ниже снимает эти флаги; для самого блока они включаются внутри bash.

```bash
set +eu
bash <<'STAGEBY_UPDATES'
set -eu
cat > /etc/apt/apt.conf.d/99stageby-security <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
#clear Unattended-Upgrade::Allowed-Origins;
#clear Unattended-Upgrade::Origins-Pattern;
Unattended-Upgrade::Allowed-Origins {
  "${distro_id}:${distro_codename}";
  "${distro_id}:${distro_codename}-security";
  "${distro_id}ESMApps:${distro_codename}-apps-security";
  "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
EOF
chmod 0644 /etc/apt/apt.conf.d/99stageby-security
systemctl enable --now apt-daily.timer apt-daily-upgrade.timer
apt-config dump | grep -E 'APT::Periodic|Unattended-Upgrade::(Automatic-Reboot|Allowed-Origins|Origins-Pattern)'
systemctl --no-pager list-timers --all apt-daily.timer apt-daily-upgrade.timer
stat -c '%a %U:%G %n' /opt/stageby/state
STAGEBY_UPDATES
```

После получения вывода проверить применённые источники, запрет автоматической
перезагрузки, таймеры и права `state`. Установка доступных обновлений этим блоком
вручную не запускается; включённые таймеры выполняют её по расписанию.

Для получения недостающего вывода выйти из просмотрщика клавишей `q`, если
приглашение оболочки не видно, и выполнить:

```bash
apt-config dump | grep -E 'APT::Periodic|Unattended-Upgrade::(Automatic-Reboot|Allowed-Origins|Origins-Pattern)'
stat -c '%a %U:%G %n' /opt/stageby/state
```

Получен дополнительный вывод: период обновления списков и unattended-upgrades —
`1`, `Automatic-Reboot` — `false`; `/opt/stageby/state` — `750 root:root`.
Однако Allowed-Origins показаны как `distro_id:distro_codename` без `${…}`.
Соответствие реальным источникам не подтверждено. Чтобы исключить повреждение
шаблонов при копировании, заменить их явными значениями Ubuntu 26.04 (resolute).

Корректирующий блок выполнен пользователем. Подтверждён `VERSION_CODENAME=resolute`;
в эффективной конфигурации четыре источника указаны с `Ubuntu`/`UbuntuESM`
и `resolute`, оба ежедневных периода равны `1`, `Automatic-Reboot` — `false`.
Настройка обновлений завершена; фактическая установка обновлений ещё не проверена.

```bash
bash <<'STAGEBY_UPDATE_ORIGINS'
set -eu
grep -E '^VERSION_CODENAME="?resolute"?$' /etc/os-release
cat > /etc/apt/apt.conf.d/99stageby-security <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
#clear Unattended-Upgrade::Allowed-Origins;
#clear Unattended-Upgrade::Origins-Pattern;
Unattended-Upgrade::Allowed-Origins {
  "Ubuntu:resolute";
  "Ubuntu:resolute-security";
  "UbuntuESMApps:resolute-apps-security";
  "UbuntuESM:resolute-infra-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
EOF
chmod 0644 /etc/apt/apt.conf.d/99stageby-security
apt-config dump | grep -E 'APT::Periodic|Unattended-Upgrade::(Automatic-Reboot|Allowed-Origins|Origins-Pattern)'
STAGEBY_UPDATE_ORIGINS
```

### Блок 6: передача и загрузка образов

Статус: комплект передан, пользователь прислал успешную загрузку четырёх образов
и замеры диска. Позже получен вывод `sha256sum -c SHA256SUMS`: все восемь файлов
имеют статус `OK`, включая архив образов и manifest. Локальный комплект
проверен на наличие: `images.tar.gz` — 274 998 275 байт.
Передача и загрузка образов не запускают приложение и не применяют миграции.

На Windows в PowerShell выполнить:

```powershell
scp -r "C:\Users\hardo\homework\stageby\docs\tmp\releases\20261031T131317903Z-1f8763d7c884-0c6dc4" root@82.202.131.126:/opt/stageby/incoming/
```

После успешного завершения SCP в SSH-сессии root выполнить:

```bash
bash <<'STAGEBY_LOAD'
set -eu
cd /opt/stageby/incoming/20261031T131317903Z-1f8763d7c884-0c6dc4
sha256sum -c SHA256SUMS
docker image load --input images.tar.gz
docker image ls
docker system df
du -sh /var/lib/docker /var/lib/containerd /opt/stageby
df -hT /
STAGEBY_LOAD
```

Загрузка gzip-архива через `--input` поддерживается
[Docker CLI](https://docs.docker.com/reference/cli/docker/image/load/).
При несовпадении SHA-256 блок останавливается перед загрузкой образов.
Получить вывод проверки восьми файлов, четырёх образов, расхода Docker/containerd
и свободного места. После этого сверить бюджет диска с фактическими измерениями.

Полученные результаты:

| Проверка | Результат |
| --- | --- |
| API / мигратор | ID `bee84316ef0a` / `4599e286cd2c`, совпадают с manifest |
| Web / PostgreSQL | ID `158f2dc55e21` / `979bccfde354`, совпадают с manifest |
| Образы Docker суммарно | 1,16 GB, включая hello-world; Docker учитывает общие слои |
| `/var/lib/docker` | 240 КиБ |
| `/var/lib/containerd` | 1,1 ГиБ |
| `/opt/stageby` | 263 МиБ |
| Корневой раздел | 38 ГиБ; занято 4,5 ГиБ, доступно 34 ГиБ |
| Контейнеры и тома | 0; приложение не запущено |

Образы и переданный комплект занимают приблизительно 1,4 ГиБ. Это согласуется
с бюджетом 6 ГиБ на три релиза и приём четвёртого при сопоставимых размерах;
четыре различных релиза фактически не загружались. Бюджет не является квотой,
размер будущих образов с pgBackRest и рост данных потребуют повторной оценки.

### DNS перед подготовкой HTTPS

Локальная проверка `Resolve-DnsName pro-rab.net -Type A -DnsOnly` показала
`5.101.152.161`, TTL 300, вместо VPS `82.202.131.126`. Запрос AAAA вернул SOA,
адрес IPv6 в ответе не получен. Приложение пока не запущено, HTTPS не проверен.

Следующий шаг пользователя: в DNS-панели домена заменить A-запись корня (`@`)
на `82.202.131.126`, сохранив остальные записи домена. Других A-записей корня
со старым адресом не оставлять. Глобальный IPv6 VPS отсутствует, AAAA для
приложения не создавать. После изменения повторно проверить DNS.

Пользователь сообщил об изменении DNS. Повторные запросы A через локальный
резолвер, `1.1.1.1` и непосредственно `ns1.beget.pro`/`ns2.beget.pro` пока
возвращают `5.101.152.161`. Новый адрес ещё не подтверждён даже ответами
авторитетных серверов Beget. Перед выпуском сертификата проверить сохранённую
A-запись корня домена и повторить запросы после обновления зоны провайдером.

Следующая проверка по запросу пользователя подтвердила обновление зоны:
`ns1.beget.pro`, `ns2.beget.pro` и публичный резолвер `1.1.1.1` возвращают
для A-записи `pro-rab.net` адрес VPS `82.202.131.126`. DNS подтверждён;
выпуск сертификата и проверка HTTPS ещё не выполнены.

### Блок 7: подготовка конфигурации и учётных данных БД

Статус: пользователь сообщил о выполнении; вывод скрипта и права файлов
не присланы. Добавлен
`infrastructure/production/server/prepare-config.mjs`; синтаксис проверен командой
`node --check`. Запуск скрипта на VPS и права ролей в PostgreSQL ещё не проверены.
По указанию пользователя скрипт читает существующие `*.env.example` из
`runtime/env/` переданного релиза, подставляет имена и пароли пользователей БД;
прочие настройки сохраняются из шаблонов.
Назначение файлов и ограничения описаны в
[infrastructure/README.md](../../infrastructure/README.md#первичная-конфигурация-vps).

В Windows выполнить:

```powershell
scp "C:\Users\hardo\homework\stageby\infrastructure\production\server\prepare-config.mjs" root@82.202.131.126:/opt/stageby/
```

Затем в SSH-сессии root выполнить:

```bash
docker run --rm -i --network none --read-only --user 0:0 --mount type=bind,src=/etc/stageby,dst=/config --mount type=bind,src=/opt/stageby/incoming/20261031T131317903Z-1f8763d7c884-0c6dc4/runtime/env,dst=/templates,readonly --entrypoint node stageby-api:20261031T131317903Z-1f8763d7c884-0c6dc4 --input-type=module - < /opt/stageby/prepare-config.mjs
stat -c '%a %U:%G %n' /etc/stageby /etc/stageby/*
nano /etc/stageby/api.env
```

В редакторе заменить `REPLACE_ME` в `S3_ACCESS_KEY_ID` и `S3_SECRET_ACCESS_KEY`
на credentials тестового бакета Beget; остальные значения сохранить.
От пользователя получить только сообщение скрипта, права файлов и подтверждение
заполнения S3, без содержимого конфигурации. Далее проверить сеть Compose,
запустить PostgreSQL, применить SQL создания ролей и миграции. Запуск API/Caddy
остаётся отдельным шагом; подготовка бэкапов и мониторинга ещё не выполнена.

### Блок 8: PostgreSQL, роли и миграции

Статус: выполнен пользователем, вывод получен. Конфигурация имеет права
`700 root:root` для каталога и `600 root:root` для четырёх файлов.
PostgreSQL healthy, SQL создания ролей завершён COMMIT, мигратор сообщил
`Migrations completed`. Под ролью `stageby_api` прочитаны версия схемы `1`,
`migrating = f` и шесть записей миграций. Порт PostgreSQL не опубликован
на хосте; `5432/tcp` в Compose ps обозначает внутренний порт контейнера.
Работа выполняется с переданным комплектом из `incoming`. Каталог релиза
пока не переносится, статус успешного деплоя не устанавливается.

```bash
bash <<'STAGEBY_DATABASE'
set -eu
cd /opt/stageby/incoming/20261031T131317903Z-1f8763d7c884-0c6dc4
export STAGEBY_CONFIG_DIR=/etc/stageby
stat -c '%a %U:%G %n' /etc/stageby /etc/stageby/database.env /etc/stageby/api.env /etc/stageby/migrator.env /etc/stageby/database-init.sql
test -s /etc/stageby/database-init.sql
docker compose --env-file release.env -f runtime/compose.yaml config --quiet
docker compose --env-file release.env -f runtime/compose.yaml up -d --wait --wait-timeout 120 postgres
docker compose --env-file release.env -f runtime/compose.yaml exec -T postgres psql -X -U stageby_admin -d stageby -v ON_ERROR_STOP=1 < /etc/stageby/database-init.sql
docker compose --env-file release.env -f runtime/compose.yaml --profile tools run --rm migrator
docker compose --env-file release.env -f runtime/compose.yaml exec -T postgres psql -X -U stageby_admin -d stageby -v ON_ERROR_STOP=1 -c "SET ROLE stageby_api; SELECT compatibility_version, migrating FROM stageby_deployment.schema_state; SELECT count(*) AS applied_migrations FROM drizzle.__drizzle_migrations;"
docker compose --env-file release.env -f runtime/compose.yaml ps
STAGEBY_DATABASE
```

Ожидаемый результат: PostgreSQL healthy, мигратор завершился с
`Migrations completed`; API может прочитать версию совместимости `1`,
признак `migrating = f` и шесть применённых миграций. Доступ API к предметным
таблицам и вход с его credentials дополнительно проверить перед запуском API.
При ошибке блок останавливается. SQL первоначальной настройки не предназначен
для повторного запуска в уже настроенной БД; при ошибке получить вывод
и определить фактическое состояние, не удаляя том PostgreSQL.

### Блок 9: пробный запуск API и HTTPS

Статус: выполнен пользователем, получен вывод HTTPS и Compose ps. Это проверка текущего
окружения этапа 3; бэкапы, мониторинг, восстановление и приёмка production ещё
не завершены. Учётная запись первого руководителя пока не создаётся.

```bash
bash <<'STAGEBY_HTTPS'
set -eu
cd /opt/stageby/incoming/20261031T131317903Z-1f8763d7c884-0c6dc4
export STAGEBY_CONFIG_DIR=/etc/stageby
if grep -q 'REPLACE_ME' /etc/stageby/api.env; then
  echo 'Fill S3 credentials in /etc/stageby/api.env first'
  exit 1
fi
docker compose --env-file release.env -f runtime/compose.yaml up -d --wait --wait-timeout 120 api
docker compose --env-file release.env -f runtime/compose.yaml exec -T api node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>{console.log('Readiness:',r.status);process.exit(r.status===200?0:1)})"
docker compose --env-file release.env -f runtime/compose.yaml up -d web
curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors --retry-max-time 120 --head https://pro-rab.net/
curl --silent --show-error --output /dev/null --write-out 'External health HTTP status: %{http_code}\n' https://pro-rab.net/api/health/ready
docker compose --env-file release.env -f runtime/compose.yaml ps
STAGEBY_HTTPS
```

Caddy получает сертификат автоматически при корректном DNS и доступных
портах 80/443, см.
[Automatic HTTPS](https://caddyserver.com/docs/automatic-https).
Ожидается внутренний readiness 200, HTTPS главной страницы 200 с проверенным
сертификатом и заголовками безопасности, внешний health 404. Получить вывод;
при ошибке остановиться на диагностике и не повторять SQL первичной настройки.

Результат: PostgreSQL и API healthy, Caddy запущен, постоянные тома Caddy созданы.
Опубликованы только TCP 80/443 и UDP 443 Caddy. Порты `3001/tcp`, `5432/tcp`
и `2019/tcp` без адреса хоста в Compose ps не являются публикациями.
В присланном фрагменте нет строки внутреннего readiness; получить её отдельно
при следующей внутренней проверке. Две первые попытки curl завершились ошибкой
TLS, последующая — HTTP/2 200 с проверкой сертификата. Это согласуется с ожиданием
первичного выпуска сертификата, но причина первых ошибок по логам не проверена.

Независимая проверка с компьютера разработчика подтвердила:

| Запрос | Результат |
| --- | --- |
| HEAD `https://pro-rab.net/` | 200, проверка TLS включена |
| HEAD `http://pro-rab.net/` | 308, Location `https://pro-rab.net/` |
| GET `/api/health/ready` | 404 |
| GET `/api/documentation` | 404 |
| GET `/api/auth/me` без сессии | 401, JSON `unauthenticated`, Cache-Control no-store |
| Защитные заголовки | HSTS, nosniff, no-referrer и Permissions Policy на HTML и API, без дубликатов проверенных заголовков |
| CSP HTML | Принудительная политика; кавычки `'self'`, `'none'` и остальных ключевых слов сохранены |

В плане отмечены выполненные пункты; составные требования разделены на выполненную
настройку и оставшиеся проверки перезагрузки, продления сертификата, внешних портов,
бэкапов и ротации. Этап 3 целиком не завершён: Ansible, бэкапы и мониторинг остаются.

### Блок 10: первый руководитель

Статус: пользователь подтвердил создание руководителя и успешный вход на сайт.
В Stageby роль `manager` выполняет функции администратора; отдельной роли admin нет.
Используется встроенная команда из собранного API с подключением `stageby_api`.
Логин — 3–64 символа: строчные латинские буквы, цифры, точка, дефис и подчёркивание,
первый символ — буква или цифра. Пароль — 8–128 символов, ФИО обязательно.

В интерактивной SSH-сессии выполнить:

```bash
cd /opt/stageby/incoming/20261031T131317903Z-1f8763d7c884-0c6dc4
export STAGEBY_CONFIG_DIR=/etc/stageby
docker compose --env-file release.env -f runtime/compose.yaml exec api node dist/commands/create-first-manager.js
```

Команда сама запросит логин, ФИО и скрытый пароль. Heredoc и `-T` не использовать:
нужен интерактивный терминал. Пароль не присылать в чат и не включать в команды.
Ожидается `Первый руководитель создан (id: …).`; затем проверить вход через
`https://pro-rab.net`. При существующих пользователях команда не меняет данные.
Создание и успешный вход отмечены в плане.

### Блок 11: проверка SSH и портов перед перезагрузкой

Статус: выполнен, результаты получены от пользователя.

В новом окне PowerShell на компьютере разработчика:

```powershell
ssh root@82.202.131.126
```

В SSH-сессии root:

```bash
bash <<'STAGEBY_CHECK'
set -eu
cd /opt/stageby/incoming/20261031T131317903Z-1f8763d7c884-0c6dc4
export STAGEBY_CONFIG_DIR=/etc/stageby
ufw status verbose
ss -lntup
systemctl is-enabled docker
docker compose --env-file release.env -f runtime/compose.yaml ps
docker compose --env-file release.env -f runtime/compose.yaml exec -T api node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>{console.log('Readiness:',r.status);process.exit(r.status===200?0:1)})"
STAGEBY_CHECK
```

В PowerShell на компьютере разработчика, вне SSH:

```powershell
22,80,443,3001,5432,2019 | ForEach-Object {
  [pscustomobject]@{
    Port = $_
    Open = Test-NetConnection 82.202.131.126 -Port $_ -InformationLevel Quiet -WarningAction SilentlyContinue
  }
}
```

Пользователь подтвердил успешное новое SSH-подключение от root после включения
firewall и прислал результаты внутренних проверок:

- UFW активен для IPv4/IPv6; разрешены TCP 22/80/443 и UDP 443,
  входящий и маршрутизируемый трафик по умолчанию запрещены.
- На публичных адресах слушают только SSH и Caddy: TCP 22/80/443, UDP 443.
  DNS и chrony слушают локальные адреса.
- Docker включён в автозапуск. API и PostgreSQL healthy, Web запущен;
  внутренний readiness API возвращает 200.
- Compose публикует только порты Caddy 80/443 TCP и 443 UDP.
  API 3001, PostgreSQL 5432 и Caddy admin 2019 не опубликованы на хосте.

Пользователь выполнил внешнюю TCP-проверку IPv4 из PowerShell: порты 22/80/443
доступны, 3001/5432/2019 недоступны. Результат отмечен в плане. При появлении
глобального IPv6 повторить внешнюю проверку для него.

Автозапуск с сохранением данных и сертификата после перезагрузки ещё не подтверждён.

### Блок 12: перезагрузка и проверка автозапуска

Статус: выполнен. Пользователь прислал результаты технических проверок
и подтвердил выход и повторный вход руководителя после перезагрузки.
Перезагрузка кратковременно прерывает работу приложения и отключает SSH.

Перед перезагрузкой в SSH-сессии вывести и сохранить серийный номер и отпечаток
текущего сертификата для сравнения:

```bash
openssl s_client -connect 127.0.0.1:443 -servername pro-rab.net </dev/null 2>/dev/null | openssl x509 -noout -serial -fingerprint -sha256
```

Затем в SSH-сессии выполнить:

```bash
systemctl reboot
```

Примерно через минуту в PowerShell на компьютере разработчика подключиться снова:

```powershell
ssh root@82.202.131.126
```

После подключения выполнить в SSH без ручного запуска контейнеров:

```bash
uptime
docker ps
curl -I --max-time 20 https://pro-rab.net/
openssl s_client -connect 127.0.0.1:443 -servername pro-rab.net </dev/null 2>/dev/null | openssl x509 -noout -serial -fingerprint -sha256
```

Ожидаются небольшой uptime после перезагрузки, автоматический запуск трёх
контейнеров, healthy у API и PostgreSQL, HTTPS 200 с проверкой TLS и совпадение
серийного номера и отпечатка сертификата до и после перезагрузки.
Дополнительно проверить вход руководителя на `https://pro-rab.net`, чтобы
подтвердить сохранность его учётной записи. Если контейнеры ещё запускаются,
повторить проверки после их готовности; при ошибке сохранить вывод для диагностики.
Пункт плана закрыть после получения результатов.

Результаты после перезагрузки, 31.10.2026 в 18:07 UTC:

- SSH-подключение восстановлено; `uptime` показывает `up 0 min`.
- Все три контейнера запустились автоматически, без ручного запуска;
  на момент проверки работали 26 секунд. API и PostgreSQL healthy.
- `curl -I --max-time 20 https://pro-rab.net/` вернул HTTP/2 200
  с включённой проверкой TLS.
- Серийный номер и SHA-256 отпечаток сертификата до и после перезагрузки
  совпадают:

```text
serial=051651D927E2C10C99C4D958F65DEE82F6E8
sha256 Fingerprint=01:F6:DF:DF:68:DF:0E:A2:2E:64:B1:98:06:D9:1B:59:99:16:A1:32:98:BE:BA:FA:4A:31:B4:D7:A4:C8:1B:08
```

Пользователь подтвердил выход и повторный вход руководителя после перезагрузки;
сохранность учётной записи подтверждена. Проверки блока отмечены в плане.
Сохранение сертификата не подтверждает его автоматическое продление;
проверка продления остаётся отдельным пунктом плана.

### Блок 13: отдельный S3-бакет для бэкапов PostgreSQL

Статус: пользователь сообщил параметры созданного бакета 01.11.2026.
Настройки работающего PostgreSQL не менялись. Приватность, отдельные credentials
и отсутствие lifecycle-правил пока не проверены.

| Параметр | Значение |
| --- | --- |
| Бакет бэкапов | `0ac5f37cad2e-stageby-backups` |
| HTTPS endpoint | `https://s3.ru1.storage.beget.cloud` |
| Регион | `ru1` |

В панели Beget создать отдельное приватное S3-хранилище с названием
`stageby-backups`. Панель сформирует полное уникальное имя бакета.
По плану предпочтителен отдельный аккаунт; в любом случае использовать
отдельные credentials нового хранилища, а не ключи бакета файлов приложения.

Не включать публичный доступ, CORS и автоматическое удаление объектов по
lifecycle: очисткой цепочки бэкапов и WAL будет управлять pgBackRest.
Сохранить новые Access Key и Secret Key вне репозитория; в чат и журнал
их не передавать. Не перегенерировать ключи существующего бакета приложения.

После создания сообщить только полное имя бакета, HTTPS endpoint и регион.
Ключи будут записаны на VPS отдельно при подготовке конфигурации pgBackRest.
Клиентское шифрование repository и сохранение ключа вне VPS остаются
следующими шагами; создание бакета не означает готовность бэкапов.

Источники:

- [Beget: создание S3-хранилища и реквизиты доступа](https://beget.com/ru/kb/manual/obektnoe-hranilishche-s3-v-beget).
- [pgBackRest: шифрование и хранение repository](https://pgbackrest.org/configuration.html).

## 01.11.2026 — блок 14: параметры PostgreSQL перед добавлением pgBackRest

Статус: выполнен пользователем; вывод получен 01.11.2026.
Выполнить от root в SSH-сессии на VPS. Команды читают настройки и метаданные;
содержимое env-файлов и пароли не выводятся. Контейнеры не перезапускаются.

```bash
bash <<'STAGEBY_BACKUP_CHECK'
set -eu
cd /opt/stageby/incoming/20261031T131317903Z-1f8763d7c884-0c6dc4
export STAGEBY_CONFIG_DIR=/etc/stageby
docker compose --env-file release.env -f runtime/compose.yaml ps
docker compose --env-file release.env -f runtime/compose.yaml exec -T postgres sh -c 'id postgres; postgres --version; command -v pgbackrest || true'
docker compose --env-file release.env -f runtime/compose.yaml exec -T postgres psql -X -U stageby_admin -d stageby -v ON_ERROR_STOP=1 -c "SELECT name, setting FROM pg_settings WHERE name IN ('data_directory', 'config_file', 'hba_file', 'archive_mode', 'archive_command', 'archive_timeout', 'wal_level', 'wal_segment_size', 'data_checksums') ORDER BY name; SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;"
postgres_container=$(docker compose --env-file release.env -f runtime/compose.yaml ps -q postgres)
test -n "$postgres_container"
docker inspect --format '{{.Config.Image}}{{range .Mounts}}{{printf "\n%s %s -> %s" .Type .Name .Destination}}{{end}}{{range $name, $network := .NetworkSettings.Networks}}{{printf "\nnetwork: %s" $name}}{{end}}' "$postgres_container"
df -h /
STAGEBY_BACKUP_CHECK
```

| Проверка | Результат |
| --- | --- |
| Контейнеры | API и PostgreSQL healthy, Web запущен |
| PostgreSQL | 18.6, Debian `18.6-1.pgdg13+2` |
| Пользователь ОС PostgreSQL | UID/GID 999 |
| Каталог данных | `/var/lib/postgresql/18/docker` |
| Конфигурация | `postgresql.conf` и `pg_hba.conf` в каталоге данных |
| WAL | `wal_level=replica`, сегмент 16 МиБ |
| Архивирование | `archive_mode=off`, `archive_timeout=0`, команда выключена |
| Checksums | Включены |
| Размер БД `stageby` | 9774 КиБ |
| Образ | `stageby-postgres:20261031T131317903Z-1f8763d7c884-0c6dc4` |
| Том | `stageby-production_postgres-data`, смонтирован в `/var/lib/postgresql` |
| Сеть PostgreSQL | Только `stageby-production_database` |
| Диск | Занято 4,6 ГиБ, свободно 34 ГиБ |

В присланном тексте команд потеряны кавычки и другие символы. Фиксируются
полученные значения; точное выполнение исходного блока не подтверждено.
Путь pgBackRest в выводе отсутствует; наличие проверяется также при сборке
нового образа, установка в работающий контейнер не выполнялась.

По результатам подготовить локально образ PostgreSQL с pgBackRest и проверить
бэкап и восстановление на отдельном временном томе. Текущий PostgreSQL подключён
только к внутренней сети `database`; для архивирования в S3 предусмотреть исходящий
доступ без публикации порта БД. На VPS передать проверенный образ отдельным шагом.
До переключения сохранить возможность возврата к исходному образу и сделать
страховочную копию текущей БД. Секреты repository и ключ шифрования подготовить
отдельно; ключ сохранить вне VPS до первого бэкапа.

### Блок 15: конфигурация и секреты repository

Статус: пользователь подтвердил выполнение команд, замену credentials S3
и сохранение ключа шифрования вне VPS. Права root:root 0600 подтверждены
выводом блока 16.
Выполнить от root в SSH-сессии на VPS. Создаётся новый файл конфигурации;
существующий файл не перезаписывается. Ключ шифрования генерируется на VPS
и сохраняется в файл без вывода в терминал.

```bash
bash <<'STAGEBY_BACKUP_CONFIG'
set -euC
umask 077
test -d /etc/stageby
test ! -e /etc/stageby/pgbackrest.conf
stageby_cipher=$(openssl rand -hex 32)
cat > /etc/stageby/pgbackrest.conf <<STAGEBY_CONFIGURATION
[global]
repo1-type=s3
repo1-path=/stageby
repo1-s3-bucket=0ac5f37cad2e-stageby-backups
repo1-s3-endpoint=s3.ru1.storage.beget.cloud
repo1-s3-region=ru1
repo1-s3-uri-style=path
repo1-s3-key=REPLACE_ME
repo1-s3-key-secret=REPLACE_ME
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=$stageby_cipher
repo1-retention-full-type=time
repo1-retention-full=30
process-max=1
start-fast=y
log-level-file=off
log-level-console=info

[stageby]
pg1-path=/var/lib/postgresql/18/docker
pg1-user=stageby_admin
pg1-database=stageby
STAGEBY_CONFIGURATION
unset stageby_cipher
chown root:root /etc/stageby/pgbackrest.conf
chmod 600 /etc/stageby/pgbackrest.conf
stat -c '%a %U:%G %n' /etc/stageby/pgbackrest.conf
STAGEBY_BACKUP_CONFIG
```

Затем в интерактивной SSH-сессии открыть файл:

```bash
nano /etc/stageby/pgbackrest.conf
```

Заменить два `REPLACE_ME` отдельными ключами бакета бэкапов.
Сохранить точное значение `repo1-cipher-pass` в менеджере паролей вне VPS
вместе с именем бакета и параметрами доступа. Не менять сгенерированный ключ
после создания repository. Не присылать содержимое файла или снимок редактора.
Получить только права файла и подтверждение заполнения credentials и сохранения
ключа вне VPS. Текущие права root:root 0600 предназначены для хранения;
доступ процесса postgres к смонтированной конфигурации настроить и проверить
при подключении нового образа. На этом шаге PostgreSQL не перезапускается,
архивирование WAL и расписание бэкапов ещё не включаются.

Настройки S3, шифрования и хранения сверены с
[документацией pgBackRest](https://pgbackrest.org/configuration.html).

### Блок 16: страховочная копия БД перед сменой образа PostgreSQL

Статус: выполнен пользователем; вывод получен. Выполнить от root
в SSH-сессии на VPS. Контейнеры продолжают работать; образ, схема и данные
не меняются. В новом закрытом каталоге создаются дамп БД и SQL ролей,
содержащий пароли ролей. Содержимое этих файлов не присылать.

```bash
bash <<'STAGEBY_PRE_BACKREST'
set -eu
umask 077
cd /opt/stageby/incoming/20261031T131317903Z-1f8763d7c884-0c6dc4
export STAGEBY_CONFIG_DIR=/etc/stageby
stat -c '%a %U:%G %n' /etc/stageby /etc/stageby/pgbackrest.conf
test "$(stat -c '%a:%U:%G' /etc/stageby/pgbackrest.conf)" = '600:root:root'
if grep -q 'REPLACE_ME' /etc/stageby/pgbackrest.conf; then
  echo 'Fill S3 credentials in /etc/stageby/pgbackrest.conf first'
  exit 1
fi
grep -Eq '^repo1-cipher-pass=[a-f0-9]{64}$' /etc/stageby/pgbackrest.conf
stageby_backup_dir=$(mktemp -d /opt/stageby/pre-pgbackrest-XXXXXXXX)
printf 'Safety backup directory: %s\n' "$stageby_backup_dir"
docker compose --env-file release.env -f runtime/compose.yaml exec -T postgres pg_dump --username=stageby_admin --dbname=stageby --format=custom > "$stageby_backup_dir/stageby.dump"
docker compose --env-file release.env -f runtime/compose.yaml exec -T postgres pg_dumpall --username=stageby_admin --globals-only > "$stageby_backup_dir/globals.sql"
test -s "$stageby_backup_dir/stageby.dump"
test -s "$stageby_backup_dir/globals.sql"
docker compose --env-file release.env -f runtime/compose.yaml exec -T postgres pg_restore --list < "$stageby_backup_dir/stageby.dump" > /dev/null
sha256sum "$stageby_backup_dir/stageby.dump" "$stageby_backup_dir/globals.sql"
stat -c '%a %U:%G %s %n' "$stageby_backup_dir" "$stageby_backup_dir/stageby.dump" "$stageby_backup_dir/globals.sql"
echo 'Safety dump created; archive listing readable'
STAGEBY_PRE_BACKREST
```

Ожидаются права 0700 каталога и 0600 файлов с владельцем root:root,
контрольные суммы и итоговое сообщение. Проверка `pg_restore --list` читает
оглавление архива; она не подтверждает полное восстановление. Копия хранится
на том же VPS и не заменяет внешний бэкап. При ошибке сохранить вывод;
незавершённые файлы не считать пригодной копией. Повтор создаст новый каталог.
На момент переключения проверить свежесть копии и при необходимости повторить блок.

После получения результата подготовить включение нового образа в проверенный
релиз, доступ postgres к конфигурации, исходящую сеть S3 и проверку страховочного
восстановления. Архивирование включать после проверки доступа к repository.

Результат блока 16: конфигурация имеет права 0600 root:root, каталог
`/etc/stageby` — 0700 root:root. Дамп и роли сохранены в
`/opt/stageby/pre-pgbackrest-nMXK3IEm`, права каталога 0700, файлов 0600,
владелец root:root. `pg_restore --list` завершился успешно.

| Файл | Размер, байт | SHA-256 |
| --- | ---: | --- |
| `stageby.dump` | 102 993 | `4689f9fc0b90ddc0ace0232c5bdcedd0cbb19078ddc32e15f7cc774427b1a106` |
| `globals.sql` | 1 241 | `853a8da8235307e0f286f8b376937c1b21ea6b0dbcf5c17cccde509ddfa8ae30` |

### Блок 17: восстановление страховочной копии в изолированном контейнере

Статус: выполнен пользователем; вывод получен. Выполнить от root
по SSH на VPS. Используется прежний образ PostgreSQL 18.6, отдельный контейнер
без сети и опубликованных портов, с данными в tmpfs. Рабочий том не подключается.
После проверки тестовый контейнер удаляется. Временный bootstrap-пользователь
отличается от ролей исходной БД, чтобы восстановить их без конфликта.

```bash
bash <<'STAGEBY_RESTORE_CHECK'
set -eu
umask 077
stageby_backup_dir=/opt/stageby/pre-pgbackrest-nMXK3IEm
stageby_restore_name=stageby-safety-restore-check
printf '%s  %s\n' '4689f9fc0b90ddc0ace0232c5bdcedd0cbb19078ddc32e15f7cc774427b1a106' "$stageby_backup_dir/stageby.dump" '853a8da8235307e0f286f8b376937c1b21ea6b0dbcf5c17cccde509ddfa8ae30' "$stageby_backup_dir/globals.sql" | sha256sum --check -
if docker container inspect "$stageby_restore_name" > /dev/null 2>&1; then
  echo 'Restore-check container already exists; stop here'
  exit 1
fi
stageby_restore_log=$(mktemp "$stageby_backup_dir/restore-check-XXXXXXXX.log")
docker run -d --pull=never --name "$stageby_restore_name" --network none --memory=1g --cpus=0.5 --shm-size=128m --tmpfs /var/lib/postgresql:rw,size=512m -e POSTGRES_USER=stageby_restore_admin -e POSTGRES_DB=postgres -e POSTGRES_HOST_AUTH_METHOD=trust stageby-postgres:20261031T131317903Z-1f8763d7c884-0c6dc4
trap 'docker rm -f "$stageby_restore_name" > /dev/null' EXIT
for stageby_attempt in $(seq 1 60); do
  if docker exec "$stageby_restore_name" pg_isready -h 127.0.0.1 -U stageby_restore_admin -d postgres > /dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$stageby_restore_name" pg_isready -h 127.0.0.1 -U stageby_restore_admin -d postgres
if ! docker exec -i "$stageby_restore_name" psql -X -U stageby_restore_admin -d postgres -v ON_ERROR_STOP=1 < "$stageby_backup_dir/globals.sql" > "$stageby_restore_log" 2>&1; then
  printf 'Role restore failed; private log: %s\n' "$stageby_restore_log"
  exit 1
fi
if ! docker exec -i "$stageby_restore_name" pg_restore --username=stageby_restore_admin --dbname=postgres --create --exit-on-error < "$stageby_backup_dir/stageby.dump" >> "$stageby_restore_log" 2>&1; then
  printf 'Database restore failed; private log: %s\n' "$stageby_restore_log"
  exit 1
fi
docker exec "$stageby_restore_name" psql -X -U stageby_restore_admin -d stageby -v ON_ERROR_STOP=1 -c "SET ROLE stageby_api; SELECT compatibility_version, migrating FROM stageby_deployment.schema_state; SELECT count(*) AS applied_migrations FROM drizzle.__drizzle_migrations; SELECT count(*) AS users, count(*) FILTER (WHERE role = 'manager') AS managers FROM public.users;"
echo 'Safety dump restored successfully; temporary container will be removed'
STAGEBY_RESTORE_CHECK
```

Ожидаются совпадение обеих SHA-256, готовность PostgreSQL, восстановление ролей
и БД без ошибок, чтение от роли API: версия схемы 1, `migrating = f`, шесть
миграций и хотя бы один руководитель. Получить вывод команд. Приватный лог
может содержать SQL с секретами; его содержимое целиком не присылать.
Успех подтверждает восстановление этой логической копии на том же VPS;
проверка pgBackRest, другого VPS и целевых RPO/RTO остаётся отдельной.

Результат: обе SHA-256 совпали; роли и БД восстановлены без ошибок.
Под ролью `stageby_api` прочитаны версия схемы 1, `migrating = f`, шесть
миграций, два пользователя и один руководитель. Получено итоговое сообщение
об успешном восстановлении. По завершении блока trap удаляет временный
контейнер; отдельный вывод проверки удаления пока не получен.
