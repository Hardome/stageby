# Журнал подготовки production

<!-- cspell:ignore hdrcharset MOUNTPOINTS publickey FSTYPE lntup chrony -->

План: `docs/plans/production-deployment.md`.
Сервер: `82.202.131.126`; начальный пользователь: `root`.
Серверные команды выполняет пользователь по SSH; результаты фиксируются после
получения вывода. Пароли, ключи, cookies и подписанные URL сюда не записывать.

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

Следующие действия: объединить исправление через PR, собрать комплект, измерить
его размер и рассчитать бюджет диска. Затем подготовить Ansible и прислать
следующий блок серверных команд с записью результата здесь.
