-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: print_manager
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `logs_sistema`
--

DROP TABLE IF EXISTS `logs_sistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs_sistema` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `usuario_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acao` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalhes` json DEFAULT NULL,
  `ip_origem` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `logs_created_idx` (`created_at`),
  KEY `fk_logs_usuario` (`usuario_id`),
  CONSTRAINT `fk_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logs_sistema`
--

LOCK TABLES `logs_sistema` WRITE;
/*!40000 ALTER TABLE `logs_sistema` DISABLE KEYS */;
INSERT INTO `logs_sistema` VALUES ('0552fcec-3917-4d55-9e54-13ca23b163f8','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-17 11:35:34.000'),('07f1b70b-8491-422b-9f46-1d1af6a4970c','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-15 12:52:19.000'),('081cb2a9-100a-4252-9fca-6f046ca1a048','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-18 07:57:55.000'),('086cda11-e211-451d-869c-3c2387c173ee','00000000-0000-4000-8000-000000000001','IMPRESSORA_CRIADA','{\"id\": \"f004a1da-9b2d-402c-8cea-b0ed31155e22\", \"nome\": \"Impressora 192.168.110.125\"}','::1','2026-05-12 08:30:08.000'),('243193e8-f01e-4b04-8e84-e64e5c131f1a','00000000-0000-4000-8000-000000000001','IMPRESSORA_CRIADA','{\"id\": \"896efdd0-c176-47af-a35d-6418ce083b43\", \"nome\": \"Konica Minolta\"}','::1','2026-05-12 07:25:50.000'),('29444704-8434-4c2f-bfc1-bc2303e88f40','5f24f6a6-703f-4548-a323-65214435b1ba','LOGIN','{\"email\": \"antonio.zimila@imperialinsurance-mz.com\"}','::1','2026-05-12 07:48:07.000'),('35313330-9eec-4d0b-92bc-e67ff9805e5b','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-15 12:19:29.000'),('38aaef4d-7539-41b2-9e9f-7250adcd610a','00000000-0000-4000-8000-000000000001','IMPRESSORA_CRIADA','{\"id\": \"cca9dc9f-963b-4e42-9ea3-0c45fd232071\", \"nome\": \"Impressora 192.168.110.218\"}','::1','2026-05-12 08:35:42.000'),('408bb5c2-54ec-46cd-8511-c9ab2b4a9e2f','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-18 08:00:50.000'),('413e6942-f7c6-409c-bc06-ae6ff79c8bfe','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"afc1f1f9-3f77-48fe-95d5-9ca93e7f0587\", \"nome\": \"Canon MX340 series Printer\"}','::1','2026-05-12 08:35:00.000'),('45b6c3c6-6abe-40b5-9c21-3e74fc5256cc','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-15 06:02:02.000'),('6150cb68-ba49-487a-a74f-91c8b5ceffa8','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"da3fb709-df66-4f3b-aa97-06a7f447966e\", \"nome\": \"OneNote for Windows 10\"}','::1','2026-05-12 08:35:20.000'),('63511e09-d415-4e98-8eca-cac7349d7bdb','00000000-0000-4000-8000-000000000001','USUARIO_CRIADO','{\"id\": \"5f24f6a6-703f-4548-a323-65214435b1ba\", \"email\": \"antonio.zimila@imperialinsurance-mz.com\"}','::1','2026-05-12 07:26:41.000'),('66e6fae3-f285-4622-80da-4dd02b60bf56','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-15 12:23:41.000'),('68b3bd8b-a0ba-4f2e-b962-d2050a39d00a','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-20 06:20:54.000'),('6d8e0b34-e66c-4df3-9ec6-85a22e7b96b0','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"8d085ef1-49a0-4eba-8dca-88ec96c36c45\", \"nome\": \"Canon MX340 series FAX\"}','::1','2026-05-12 08:34:57.000'),('73a6ee37-ece4-48b3-a8c9-070861d90e02','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"f004a1da-9b2d-402c-8cea-b0ed31155e22\", \"nome\": \"Impressora 192.168.110.125\"}','::1','2026-05-12 08:35:07.000'),('756ea96c-83a9-48f3-a482-57d8b36486ea','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-18 07:51:50.000'),('7846e0bf-2406-4069-927f-215b8b027e2f','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-18 07:53:26.000'),('7bfbe658-49b8-4d87-a30c-cacfdaaaac3d','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-15 12:44:36.000'),('8062f25b-ff32-4df9-9d20-15174e8ff05a','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"896efdd0-c176-47af-a35d-6418ce083b43\", \"nome\": \"Konica Minolta\"}','::1','2026-05-12 08:35:09.000'),('8196e150-3bd6-4f1d-831d-556b297e01d6','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-15 13:22:09.000'),('91b527a3-2a05-489e-b825-6275407fdf3b','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-15 11:05:09.000'),('922131bc-597e-4c16-bfa1-b5c2e7fe3224','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-12 07:22:37.000'),('9727df3e-5fed-4c85-b8ac-05d232619281','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"cca9dc9f-963b-4e42-9ea3-0c45fd232071\", \"nome\": \"Impressora 192.168.110.218\"}','::1','2026-05-15 12:24:29.000'),('9f4780e7-48cf-4d82-8ae0-d0e2b56d1142','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-12 08:03:24.000'),('a60a1cad-6543-41c7-a156-efe2bd7584fe','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"9207559d-b952-45d5-8880-59d22a4e50b9\", \"nome\": \"OneNote (Desktop)\"}','::1','2026-05-12 08:35:17.000'),('ad1662e4-265e-4fd6-8011-848f9f6d5e79','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"c49c4733-a35b-4fcd-9c8e-2014797fecf2\", \"nome\": \"HPIFAF088 (HP Color LaserJet Pro MFP 4303)\"}','::1','2026-05-12 08:35:06.000'),('b32df738-6056-446f-a6c7-5bb7ecbfdd75','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"7c68740e-d5bb-4ed1-bda8-69cb5b172cf4\", \"nome\": \"AnyDesk Printer\"}','::1','2026-05-12 08:34:55.000'),('b438f71f-49cc-4755-84fc-456abe2637f0','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-18 08:47:40.000'),('be5bcf31-1776-4c13-94cf-2894ea6d37f4','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"36913d88-0daf-4f81-b8a5-eba2d44788bc\", \"nome\": \"HP Color LaserJet MFP M181fw PCL (fe80::c665:16ff:fedb:9e91%7) UPD\"}','::1','2026-05-12 08:35:04.000'),('bf821d14-9cc4-428a-9662-553e15785db1','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-27 09:25:21.000'),('c54d0b1c-bbad-4d1b-aba9-4cc75a6b2863','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-21 07:52:23.000'),('cf6b83af-6e22-4857-a2b6-e5f3a3c64bd6','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"d70b10cb-76e0-4f58-994f-366fdaf124c6\", \"nome\": \"Microsoft XPS Document Writer\"}','::1','2026-05-12 08:35:13.000'),('d9691b39-ed89-41f7-9d0f-409927517338','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-14 14:33:19.000'),('e013fe39-57bf-4c3a-ad9e-3795ffd3af3d','00000000-0000-4000-8000-000000000001','LOGIN','{\"email\": \"admin@empresa.local\"}','::1','2026-05-12 08:05:23.000'),('e1b34f96-9d43-455f-af31-53bd3cd78bd1','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"cd7d9405-e747-4cfa-8b16-230a01ade877\", \"nome\": \"Fax\"}','::1','2026-05-12 08:35:02.000'),('ee7551b1-bc62-4b2d-9ded-3cc8116ff7fd','00000000-0000-4000-8000-000000000001','IMPRESSORA_REMOVIDA','{\"id\": \"05ac5eaf-bbf9-4ad6-894d-89fae56750c7\", \"nome\": \"Microsoft Print to PDF\"}','::1','2026-05-12 08:35:11.000');
/*!40000 ALTER TABLE `logs_sistema` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-27  2:35:44
