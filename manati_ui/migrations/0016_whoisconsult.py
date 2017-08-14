# -*- coding: utf-8 -*-
# Generated by Django 1.9.7 on 2016-11-07 21:14
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import jsonfield.fields
import model_utils.fields


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('manati_ui', '0015_auto_20161104_0944'),
    ]

    operations = [
        migrations.CreateModel(
            name='WhoisConsult',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', model_utils.fields.AutoCreatedField(default=django.utils.timezone.now, editable=False, verbose_name='created_at')),
                ('updated_at', model_utils.fields.AutoLastModifiedField(default=django.utils.timezone.now, editable=False, verbose_name='updated_at')),
                ('query_node', models.CharField(max_length=100)),
                ('info_report', jsonfield.fields.JSONField(default=b'{}')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'manati_whois_consults',
            },
        ),
    ]
